from rest_framework import serializers
from theses.models import GradeWeightConfig


class GradeWeightItemSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=GradeWeightConfig.Scope.choices)
    component = serializers.ChoiceField(choices=GradeWeightConfig.Component.choices)
    weight = serializers.DecimalField(max_digits=3, decimal_places=2)