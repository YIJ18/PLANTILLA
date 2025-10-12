from django.contrib import admin
from .models import Mission, Flight, FlightPath, FlightTelemetrySession


@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    """
    Administración para el modelo Mission
    """
    list_display = ('name', 'status', 'priority', 'planned_start', 'created_by', 'created_at')
    list_filter = ('status', 'priority', 'planned_start', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('assigned_to',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'status', 'priority')
        }),
        ('Fechas Planificadas', {
            'fields': ('planned_start', 'planned_end')
        }),
        ('Fechas Reales', {
            'fields': ('actual_start', 'actual_end'),
            'classes': ('collapse',)
        }),
        ('Asignación', {
            'fields': ('created_by', 'assigned_to')
        }),
        ('Información del Sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Solo al crear
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    """
    Administración para el modelo Flight
    """
    list_display = ('flight_number', 'mission', 'pilot', 'status', 'planned_departure', 'created_at')
    list_filter = ('status', 'mission', 'pilot', 'planned_departure', 'created_at')
    search_fields = ('flight_number', 'aircraft_id', 'departure_location', 'destination_location')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('mission', 'flight_number', 'aircraft_id', 'pilot', 'status')
        }),
        ('Ubicaciones', {
            'fields': ('departure_location', 'destination_location')
        }),
        ('Coordenadas', {
            'fields': ('departure_latitude', 'departure_longitude', 'destination_latitude', 'destination_longitude'),
            'classes': ('collapse',)
        }),
        ('Fechas Planificadas', {
            'fields': ('planned_departure', 'planned_arrival')
        }),
        ('Fechas Reales', {
            'fields': ('actual_departure', 'actual_arrival'),
            'classes': ('collapse',)
        }),
        ('Estadísticas de Vuelo', {
            'fields': ('max_altitude', 'max_speed', 'distance_traveled', 'fuel_consumed'),
            'classes': ('collapse',)
        }),
        ('Notas', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Información del Sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FlightPath)
class FlightPathAdmin(admin.ModelAdmin):
    """
    Administración para el modelo FlightPath
    """
    list_display = ('flight', 'timestamp', 'latitude', 'longitude', 'altitude', 'speed')
    list_filter = ('flight', 'timestamp')
    search_fields = ('flight__flight_number',)
    ordering = ('flight', 'timestamp')
    
    fieldsets = (
        ('Vuelo', {
            'fields': ('flight', 'timestamp')
        }),
        ('Posición', {
            'fields': ('latitude', 'longitude', 'altitude')
        }),
        ('Navegación', {
            'fields': ('speed', 'heading'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FlightTelemetrySession)
class FlightTelemetrySessionAdmin(admin.ModelAdmin):
    """
    Administración para el modelo FlightTelemetrySession
    """
    list_display = ('flight', 'start_time', 'end_time')
    list_filter = ('flight', 'start_time')
    search_fields = ('flight__flight_number',)
    ordering = ('-start_time',)
    filter_horizontal = ('telemetry_data', 'gyroscope_data')
    
    fieldsets = (
        ('Sesión', {
            'fields': ('flight', 'start_time', 'end_time')
        }),
        ('Datos Asociados', {
            'fields': ('telemetry_data', 'gyroscope_data'),
            'classes': ('collapse',)
        }),
    )