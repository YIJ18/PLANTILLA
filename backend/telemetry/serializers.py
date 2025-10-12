from rest_framework import serializers
from .models import Sensor, TelemetryData, GyroscopeData, Alert


class SensorSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Sensor
    """
    class Meta:
        model = Sensor
        fields = [
            'id', 'name', 'sensor_type', 'description', 'unit',
            'min_value', 'max_value', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TelemetryDataSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo TelemetryData
    """
    sensor_name = serializers.CharField(source='sensor.name', read_only=True)
    sensor_type = serializers.CharField(source='sensor.sensor_type', read_only=True)
    sensor_unit = serializers.CharField(source='sensor.unit', read_only=True)
    
    class Meta:
        model = TelemetryData
        fields = [
            'id', 'sensor', 'sensor_name', 'sensor_type', 'sensor_unit',
            'value', 'timestamp', 'latitude', 'longitude', 'altitude',
            'quality', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TelemetryDataCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear datos de telemetría
    """
    class Meta:
        model = TelemetryData
        fields = [
            'sensor', 'value', 'timestamp', 'latitude', 'longitude',
            'altitude', 'quality'
        ]


class GyroscopeDataSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo GyroscopeData
    """
    class Meta:
        model = GyroscopeData
        fields = [
            'id', 'timestamp', 'roll', 'pitch', 'yaw',
            'angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AlertSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Alert
    """
    sensor_name = serializers.CharField(source='sensor.name', read_only=True)
    acknowledged_by_name = serializers.CharField(
        source='acknowledged_by.full_name', 
        read_only=True
    )
    
    class Meta:
        model = Alert
        fields = [
            'id', 'title', 'message', 'alert_type', 'sensor', 'sensor_name',
            'telemetry_data', 'is_acknowledged', 'acknowledged_by',
            'acknowledged_by_name', 'acknowledged_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AlertAcknowledgeSerializer(serializers.Serializer):
    """
    Serializer para reconocer alertas
    """
    alert_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='Lista de IDs de alertas a reconocer'
    )