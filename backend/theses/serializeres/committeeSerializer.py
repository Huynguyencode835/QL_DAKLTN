from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from theses.models import Committee, CommitteeMember, ProjectRegistration, User


class CommitteeMemberWriteSerializer(serializers.Serializer):
    lecturer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.LECTURER, is_active=True),
    )
    role = serializers.ChoiceField(choices=CommitteeMember.MemberRole.choices)


class CommitteeMemberReadSerializer(serializers.ModelSerializer):
    lecturer_name = serializers.SerializerMethodField()

    class Meta:
        model = CommitteeMember
        fields = ['id', 'lecturer', 'lecturer_name', 'role']

    def get_lecturer_name(self, obj):
        return f"{obj.lecturer.last_name} {obj.lecturer.first_name}".strip()


class CommitteeSerializer(serializers.ModelSerializer):
    members = CommitteeMemberWriteSerializer(many=True, write_only=True)
    registrations = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ProjectRegistration.objects.filter(active=True),
        write_only=True,
    )
    members_detail = CommitteeMemberReadSerializer(source='members', many=True, read_only=True)
    registrations_detail = serializers.SerializerMethodField()

    class Meta:
        model = Committee
        fields = [
            'id', 'name', 'defense_date', 'location', 'status',
            'members', 'registrations',
            'members_detail', 'registrations_detail',
        ]
        read_only_fields = ['id']

    def get_registrations_detail(self, obj):
        from theses.serializeres.projectRegistrationSerializer import ProjectRegistrationSerializer
        regs = obj.registrations.filter(active=True)
        return ProjectRegistrationSerializer(regs, many=True, context=self.context).data

    def validate_members(self, value):
        if not value:
            raise serializers.ValidationError('Phải có ít nhất 1 thành viên hội đồng.')
        roles = [m['role'] for m in value]
        if roles.count(CommitteeMember.MemberRole.CHAIR) != 1:
            raise serializers.ValidationError('Hội đồng phải có đúng 1 chủ tịch.')
        return value

    def validate_registrations(self, value):
        period = self.context.get('registration_period')
        if period:
            existing = Committee.objects.filter(
                registration_period=period, active=True,
            ).exclude(pk=getattr(self.instance, 'pk', None)).values_list(
                'registrations', flat=True,
            )
            conflicts = set(value) & set(existing)
            if conflicts:
                raise serializers.ValidationError(
                    f'Các đăng ký IDs {conflicts} đã thuộc hội đồng khác.'
                )
        return value
    
    def validate(self, attrs):
        members = attrs.get('members', getattr(self.instance, 'members', None) and None)
        defense_date = attrs.get('defense_date', getattr(self.instance, 'defense_date', None))

        if defense_date and defense_date < timezone.now():
            raise serializers.ValidationError({
                'defense_date': 'Ngày bảo vệ không được ở quá khứ.'
            })

        if 'members' in attrs and defense_date:
            lecturer_ids = [m['lecturer'].id for m in attrs['members']]
            conflicting = CommitteeMember.objects.filter(
                lecturer_id__in=lecturer_ids,
                committee__defense_date=defense_date,
                committee__active=True,
            ).exclude(
                committee=self.instance,
            ).select_related('lecturer', 'committee')

            if conflicting.exists():
                conflicts_detail = ', '.join(
                    f'{cm.lecturer.get_full_name() or cm.lecturer.username} (hội đồng "{cm.committee.name}")'
                    for cm in conflicting
                )
                raise serializers.ValidationError({
                    'members': f'Các giảng viên sau đã có lịch bảo vệ khác cùng thời điểm: {conflicts_detail}.'
                })

        return attrs

    def _save_members(self, committee, members_data):
        CommitteeMember.objects.filter(committee=committee).delete()
        for m in members_data:
            CommitteeMember.objects.create(
                committee=committee,
                lecturer=m['lecturer'],
                role=m['role'],
            )

    def _save_registrations(self, committee, registrations_data):
        committee.registrations.set(registrations_data)

    def create(self, validated_data):
        members_data = validated_data.pop('members')
        registrations_data = validated_data.pop('registrations')
        validated_data['registration_period'] = self.context['registration_period']
        validated_data['created_by'] = self.context['request'].user
        with transaction.atomic():
            committee = Committee.objects.create(**validated_data)
            self._save_members(committee, members_data)
            self._save_registrations(committee, registrations_data)
        return committee

    def update(self, instance, validated_data):
        members_data = validated_data.pop('members', None)
        registrations_data = validated_data.pop('registrations', None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            if members_data is not None:
                self._save_members(instance, members_data)
            if registrations_data is not None:
                self._save_registrations(instance, registrations_data)
        return instance


class CommitteeListSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    registration_count = serializers.IntegerField(source='registrations.count', read_only=True)

    class Meta:
        model = Committee
        fields = ['id', 'name', 'defense_date', 'location', 'status', 'member_count', 'registration_count']

class CommitteeLecturerListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Committee
        fields = ['id', 'name', 'defense_date', 'location', 'status', 'role']

    def get_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        member = next(
            (m for m in obj.members.all() if m.lecturer_id == request.user.id),
            None,
        )
        return member.role if member else None


class CommitteeStudentListSerializer(serializers.ModelSerializer):
    registration_count = serializers.IntegerField(source='registrations.count', read_only=True)

    class Meta:
        model = Committee
        fields = ['id', 'name', 'defense_date', 'location', 'status', 'registration_count']


class CommitteeStudentSerializer(serializers.ModelSerializer):
    members_detail = CommitteeMemberReadSerializer(source='members', many=True, read_only=True)
    registrations_detail = serializers.SerializerMethodField()

    class Meta:
        model = Committee
        fields = [
            'id', 'name', 'defense_date', 'location', 'status',
            'members_detail', 'registrations_detail',
        ]

    def get_registrations_detail(self, obj):
        from theses.serializeres.projectRegistrationSerializer import ProjectRegistrationSerializer
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        regs = obj.registrations.filter(active=True, student=request.user)
        return ProjectRegistrationSerializer(regs, many=True, context=self.context).data