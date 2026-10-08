"""
api/serializers.py

DRF serializers for request validation and response shaping.
Using serializers ensures clean, documented API contracts.
"""

from rest_framework import serializers


# ------------------------------------------------------------------
# Chat endpoint — /chat (POST)
# ------------------------------------------------------------------

class ChatRequestSerializer(serializers.Serializer):
    """
    Validates incoming chat request payloads.

    Fields:
        query      (str): The user's question (required)
        mode       (str): "ai" for global or "web" for project-specific
        project_id (str): Required when mode="web", ignored otherwise
    """
    query = serializers.CharField(
        required=True,
        max_length=4096,
        help_text="The user's natural language query.",
    )
    mode = serializers.ChoiceField(
        choices=["ai", "web"],
        default="ai",
        help_text="'ai' = global chat across all projects; 'web' = project-specific chat.",
    )
    project_id = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        default=None,
        help_text="Project ID to scope the query (required when mode='web').",
    )
    chat_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Optional list of previous messages [{'role': 'user'|'assistant', 'content': '...'}].",
    )

    def validate(self, data):
        """Cross-field validation: project_id is required when mode='web'."""
        if data.get("mode") == "web" and not data.get("project_id"):
            raise serializers.ValidationError(
                {"project_id": "project_id is required when mode is 'web'."}
            )
        return data


class SourceMetaSerializer(serializers.Serializer):
    """Represents a single retrieved source document returned with the AI response."""
    project_id = serializers.CharField()
    title = serializers.CharField()
    image_url = serializers.CharField(allow_blank=True)
    snippet = serializers.CharField()


class ChatResponseSerializer(serializers.Serializer):
    """Shape of the successful chat API response."""
    answer = serializers.CharField()
    mode = serializers.CharField()
    project_id = serializers.CharField(allow_null=True)
    sources = SourceMetaSerializer(many=True)


# ------------------------------------------------------------------
# Speech-to-Text endpoint — /speech-to-text (POST)
# ------------------------------------------------------------------

class SpeechToTextResponseSerializer(serializers.Serializer):
    """Shape of the speech-to-text API response."""
    transcript = serializers.CharField()
    provider = serializers.CharField()

# ------------------------------------------------------------------
# Project endpoints
# ------------------------------------------------------------------
from .models import Project, ProjectImage

class ProjectImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectImage
        fields = ['image_url', 'order']

class ProjectSerializer(serializers.ModelSerializer):
    slides = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'tech_stack', 'created_at', 
            'category_name', 'short_description', 'motivation', 'goal',
            'problem_solved', 'architecture', 'design_process', 'skills',
            'key_features', 'target_users', 'challenges', 'results',
            'future_improvements', 'tags', 'keywords', 'faq', 'slides'
        ]

    def get_slides(self, obj):
        # Return a flat list of image URLs just like the frontend expects
        return [img.image_url for img in obj.slides.all()]
