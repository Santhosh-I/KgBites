# Generated migration for counter-based delivery tracking

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_rename_orders_orde_code_st_3a3b9f_idx_orders_orde_code_952a0f_idx_and_more'),
        ('menu', '0002_alter_counter_options_alter_fooditem_options_and_more'),
    ]

    operations = [
        # Add counter delivery tracking to OrderOTP
        migrations.AddField(
            model_name='orderotp',
            name='counters_delivered',
            field=models.JSONField(default=dict, help_text='Tracks which counters have delivered their items: {counter_id: {delivered_at, delivered_by, item_ids}}'),
        ),
        migrations.AddField(
            model_name='orderotp',
            name='all_items_delivered',
            field=models.BooleanField(default=False, db_index=True, help_text='True when all items from all counters are delivered'),
        ),
        
        # Add delivery tracking to OrderItem
        migrations.AddField(
            model_name='orderitem',
            name='delivered',
            field=models.BooleanField(default=False, db_index=True, help_text='Whether this item has been delivered'),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True, db_index=True, help_text='When this item was delivered'),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='delivered_by',
            field=models.CharField(blank=True, max_length=255, null=True, help_text='Staff member who delivered this item'),
        ),
        
        # Add indexes for performance
        migrations.AddIndex(
            model_name='orderotp',
            index=models.Index(fields=['all_items_delivered', 'status'], name='orders_orde_all_ite_idx'),
        ),
        migrations.AddIndex(
            model_name='orderitem',
            index=models.Index(fields=['delivered', 'created_at'], name='orders_orde_deliver_idx'),
        ),
    ]
