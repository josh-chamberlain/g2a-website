# Generated by Django 3.1.3 on 2021-03-11 16:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("PxPUC", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="question",
            name="category",
            field=models.ManyToManyField(related_name="questions", to="PxPUC.Category"),
        ),
    ]