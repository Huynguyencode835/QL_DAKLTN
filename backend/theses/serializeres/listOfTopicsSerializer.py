from rest_framework import serializers
from theses.models import ListOfTopics
from theses.validators import (
    validate_non_blank,
    validate_length,
    validate_no_dangerous_chars,
)


class ListOfTopicsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListOfTopics
        fields = ['id', 'title', 'description']
        read_only_fields = ['id']

    def validate_title(self, value):
        value = validate_non_blank(value, 'Title')
        value = validate_length(value, 'Title', max_length=255)
        value = validate_no_dangerous_chars(value, 'Title')
        return value

    def validate_description(self, value):
        value = validate_non_blank(value, 'Description')
        value = validate_no_dangerous_chars(value, 'Description')
        return value


class ListOfTopicsDetailSerializer(ListOfTopicsSerializer):
    class Meta:
        model = ListOfTopicsSerializer.Meta.model
        fields = ListOfTopicsSerializer.Meta.fields + ['difficulty_level', 'technology']

    def validate_technology(self, value):
        if not value or not value.strip():
            return value
        value = validate_no_dangerous_chars(value, 'Technology')
        return value.strip()
