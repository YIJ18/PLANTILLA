from rest_framework import serializers
from .models import Mission, Flight, FlightPath, FlightTelemetrySession
from accounts.models import User


class MissionSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Mission
    """
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_to_names = serializers.SerializerMethodField()
    duration_planned = serializers.ReadOnlyField()
    duration_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Mission
        fields = [
            'id', 'name', 'description', 'status', 'priority',
            'planned_start', 'planned_end', 'actual_start', 'actual_end',
            'created_by', 'created_by_name', 'assigned_to', 'assigned_to_names',
            'duration_planned', 'duration_actual', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_assigned_to_names(self, obj):
        return [user.full_name for user in obj.assigned_to.all()]


class MissionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear misiones
    """
    class Meta:
        model = Mission
        fields = [
            'name', 'description', 'status', 'priority',
            'planned_start', 'planned_end', 'assigned_to'
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class FlightSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Flight
    """
    mission_name = serializers.CharField(source='mission.name', read_only=True)
    pilot_name = serializers.CharField(source='pilot.full_name', read_only=True)
    duration_planned = serializers.ReadOnlyField()
    duration_actual = serializers.ReadOnlyField()
    
    class Meta:
        model = Flight
        fields = [
            'id', 'mission', 'mission_name', 'flight_number', 'aircraft_id',
            'pilot', 'pilot_name', 'status', 'departure_location',
            'destination_location', 'departure_latitude', 'departure_longitude',
            'destination_latitude', 'destination_longitude', 'planned_departure',
            'planned_arrival', 'actual_departure', 'actual_arrival',
            'max_altitude', 'max_speed', 'distance_traveled', 'fuel_consumed',
            'notes', 'duration_planned', 'duration_actual', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FlightCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear vuelos
    """
    class Meta:
        model = Flight
        fields = [
            'mission', 'flight_number', 'aircraft_id', 'pilot',
            'departure_location', 'destination_location',
            'departure_latitude', 'departure_longitude',
            'destination_latitude', 'destination_longitude',
            'planned_departure', 'planned_arrival', 'notes'
        ]


class FlightPathSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo FlightPath
    """
    class Meta:
        model = FlightPath
        fields = [
            'id', 'flight', 'timestamp', 'latitude', 'longitude',
            'altitude', 'speed', 'heading'
        ]
        read_only_fields = ['id']


class FlightTelemetrySessionSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo FlightTelemetrySession
    """
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    telemetry_count = serializers.SerializerMethodField()
    gyroscope_count = serializers.SerializerMethodField()
    
    class Meta:
        model = FlightTelemetrySession
        fields = [
            'id', 'flight', 'flight_number', 'start_time', 'end_time',
            'telemetry_data', 'gyroscope_data', 'telemetry_count',
            'gyroscope_count'
        ]
        read_only_fields = ['id']
    
    def get_telemetry_count(self, obj):
        return obj.telemetry_data.count()
    
    def get_gyroscope_count(self, obj):
        return obj.gyroscope_data.count()


class FlightStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer para actualizar el estado de un vuelo
    """
    status = serializers.ChoiceField(choices=Flight.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_status(self, value):
        # Validaciones de transición de estado
        current_status = self.instance.status if self.instance else None
        
        # Lógica de validación de transiciones permitidas
        valid_transitions = {
            'pre_flight': ['active', 'aborted'],
            'active': ['landed', 'emergency', 'aborted'],
            'landed': [],  # Estado final
            'emergency': ['landed', 'aborted'],
            'aborted': [],  # Estado final
        }
        
        if current_status and value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"No se puede cambiar de '{current_status}' a '{value}'"
            )
        
        return value


class FlightSummarySerializer(serializers.ModelSerializer):
    """
    Serializer resumido para vuelos
    """
    mission_name = serializers.CharField(source='mission.name', read_only=True)
    pilot_name = serializers.CharField(source='pilot.full_name', read_only=True)
    
    class Meta:
        model = Flight
        fields = [
            'id', 'flight_number', 'mission_name', 'pilot_name',
            'status', 'planned_departure', 'actual_departure'
        ]