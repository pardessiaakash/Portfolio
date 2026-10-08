from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon_url = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.IntegerField(default=0)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

class Project(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    tech_stack = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Establish ForeignKey relationship to Category
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="projects")
    
    short_description = models.TextField(blank=True, null=True)
    motivation = models.TextField(blank=True, null=True)
    goal = models.TextField(blank=True, null=True)
    problem_solved = models.TextField(blank=True, null=True)
    architecture = models.TextField(blank=True, null=True)
    design_process = models.TextField(blank=True, null=True)
    skills = models.TextField(blank=True, null=True)
    
    key_features = models.JSONField(default=list, blank=True, null=True)
    target_users = models.JSONField(default=list, blank=True, null=True)
    challenges = models.JSONField(default=list, blank=True, null=True)
    results = models.JSONField(default=list, blank=True, null=True)
    future_improvements = models.JSONField(default=list, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True, null=True)
    keywords = models.JSONField(default=list, blank=True, null=True)
    faq = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        db_table = "projects"

    def __str__(self):
        return self.title

class ProjectImage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="slides")
    image_url = models.CharField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "project_images"
        ordering = ['order']

    def __str__(self):
        return f"{self.project.title} - Slide {self.order}"
