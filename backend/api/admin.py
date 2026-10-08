from django.contrib import admin
from .models import Category, Project, ProjectImage

class ProjectImageInline(admin.TabularInline):
    model = ProjectImage
    extra = 1

class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'created_at')
    list_filter = ('category',)
    search_fields = ('title', 'description', 'short_description')
    inlines = [ProjectImageInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'category', 'image_url', 'tech_stack', 'short_description', 'description')
        }),
        ('Detailed Content', {
            'fields': ('motivation', 'goal', 'problem_solved', 'architecture', 'design_process', 'skills')
        }),
        ('Lists (JSON Arrays)', {
            'fields': ('key_features', 'target_users', 'challenges', 'results', 'future_improvements', 'tags', 'keywords', 'faq'),
            'classes': ('collapse',),
            'description': 'These fields must be formatted as valid JSON arrays, e.g. ["item 1", "item 2"]'
        }),
    )

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'display_order')
    prepopulated_fields = {'slug': ('name',)}

admin.site.register(Category, CategoryAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(ProjectImage)
