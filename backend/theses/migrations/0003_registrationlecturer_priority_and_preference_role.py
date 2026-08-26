from django.db import migrations, models


def backfill_legacy_options(apps, schema_editor):
    RegistrationLecturer = apps.get_model('theses', 'RegistrationLecturer')
    RegistrationLecturer.objects.filter(role='option1').update(role='preference', priority=1)
    RegistrationLecturer.objects.filter(role='option2').update(role='preference', priority=2)


def reverse_backfill_legacy_options(apps, schema_editor):
    RegistrationLecturer = apps.get_model('theses', 'RegistrationLecturer')
    RegistrationLecturer.objects.filter(role='preference', priority=1).update(role='option1')
    RegistrationLecturer.objects.filter(role='preference', priority=2).update(role='option2')


class Migration(migrations.Migration):

    dependencies = [
        ('theses', '0002_remove_registrationperiod_unique_open_registration_period_per_faculty_and_more'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='registrationlecturer',
            name='unique_role_per_registration',
        ),
        migrations.AddField(
            model_name='registrationlecturer',
            name='priority',
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text='Thứ tự ưu tiên trong các nguyện vọng của cùng 1 registration. Số nhỏ hơn = ưu tiên cao hơn.',
            ),
            preserve_default=True,
        ),
        migrations.RunPython(
            backfill_legacy_options,
            reverse_backfill_legacy_options,
        ),
        migrations.AddConstraint(
            model_name='registrationlecturer',
            constraint=models.UniqueConstraint(
                condition=models.Q(('role', 'preference')),
                fields=('registration', 'priority'),
                name='unique_priority_per_registration_preference',
            ),
        ),
    ]
