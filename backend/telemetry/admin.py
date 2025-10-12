from django.contrib import admin
from .models import Sensor, TelemetryData, GyroscopeData, Alert


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    """
    Administración para el modelo Sensor
    """
    list_display = ('name', 'sensor_type', 'unit', 'is_active', 'created_at')
    list_filter = ('sensor_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'sensor_type', 'description')
        }),
        ('Configuración', {
            'fields': ('unit', 'min_value', 'max_value', 'is_active')
        }),
    )


@admin.register(TelemetryData)
class TelemetryDataAdmin(admin.ModelAdmin):
    """
    Administración para el modelo TelemetryData
    """
    list_display = ('sensor', 'value', 'quality', 'timestamp', 'created_at')
    list_filter = ('sensor', 'quality', 'timestamp', 'created_at')
    search_fields = ('sensor__name',)
    ordering = ('-timestamp',)
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Datos del Sensor', {
            'fields': ('sensor', 'value', 'timestamp', 'quality')
        }),
        ('Ubicación', {
            'fields': ('latitude', 'longitude', 'altitude'),
            'classes': ('collapse',)
        }),
        ('Información del Sistema', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(GyroscopeData)
class GyroscopeDataAdmin(admin.ModelAdmin):
    """
    Administración para el modelo GyroscopeData
    """
    list_display = ('timestamp', 'roll', 'pitch', 'yaw', 'created_at')
    list_filter = ('timestamp', 'created_at')
    ordering = ('-timestamp',)
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Rotación', {
            'fields': ('timestamp', 'roll', 'pitch', 'yaw')
        }),
        ('Velocidad Angular', {
            'fields': ('angular_velocity_x', 'angular_velocity_y', 'angular_velocity_z'),
            'classes': ('collapse',)
        }),
        ('Información del Sistema', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    """
    Administración para el modelo Alert
    """
    list_display = ('title', 'alert_type', 'sensor', 'is_acknowledged', 'created_at')
    list_filter = ('alert_type', 'is_acknowledged', 'sensor', 'created_at')
    search_fields = ('title', 'message')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Alerta', {
            'fields': ('title', 'message', 'alert_type')
        }),
        ('Referencias', {
            'fields': ('sensor', 'telemetry_data'),
            'classes': ('collapse',)
        }),
        ('Estado', {
            'fields': ('is_acknowledged', 'acknowledged_by', 'acknowledged_at')
        }),
        ('Información del Sistema', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if obj.is_acknowledged and not obj.acknowledged_by:
            obj.acknowledged_by = request.user
            if not obj.acknowledged_at:
                from django.utils import timezone
                obj.acknowledged_at = timezone.now()
        super().save_model(request, obj, form, change)