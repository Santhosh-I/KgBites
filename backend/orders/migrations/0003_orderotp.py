from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_alter_orderitem_options_alter_order_completed_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrderOTP',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(db_index=True, max_length=8, unique=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('used', 'Used'), ('expired', 'Expired')], db_index=True, default='active', max_length=10)),
                ('payload', models.JSONField(default=dict)),
                ('generated_by', models.CharField(blank=True, max_length=255, null=True)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('used_at', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True, db_index=True)),
            ],
            options={
                'indexes': [
                    models.Index(fields=['code', 'status'], name='orders_orde_code_st_3a3b9f_idx'),
                    models.Index(fields=['expires_at', 'status'], name='orders_orde_expires__ed7a79_idx')
                ],
            },
        ),
    ]
