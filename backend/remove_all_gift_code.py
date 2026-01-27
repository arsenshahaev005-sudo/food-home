#!/usr/bin/env python
"""Remove all gift-related code from views.py"""

gift_keywords = [
    'GiftOrder',
    'GiftProduct',
    'GiftActivationAttempt',
    'GiftCreateIdempotency',
    'GiftCreateSerializer',
    'GiftSerializer',
    'GiftPreviewSerializer',
    'GiftActivateSerializer',
    'GiftStatusSerializer',
    'GiftService',
    'GiftActivationContext',
    'PublicGiftService',
    'GiftCreateDTO',
    'GiftAnalyticsService',
    'GiftTokenIPThrottle',
    'GiftNotifyThrottle',
    'OrderUpdateGiftDetailsView',
    '_update_gift_details_logic',
    'notify_gift_recipient',
    'update_gift_details',
    'GIFT_BULK_MAX_ITEMS',
    'GIFT_NOTIFICATION_ALLOWED_CHANNELS',
]

with open('api/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result_lines = []
skip_until_next_class = False

for i, line in enumerate(lines):
    # Check if this line starts a gift view
    if line.strip().startswith('class '):
        class_name = line.strip().split('(')[0].replace('class ', '')
        if 'Gift' in class_name:
            skip_until_next_class = True
            continue
    
    # Skip lines until we find the next class (not gift-related)
    if skip_until_next_class:
        if line.strip().startswith('class '):
            # Check if this is another gift view
            class_name = line.strip().split('(')[0].replace('class ', '')
            if 'Gift' in class_name:
                continue
            else:
                skip_until_next_class = False
                result_lines.append(line)
        continue
    
    # If we're not in a gift view, keep line
    if not skip_until_next_class:
        # Check if line contains any gift keyword
        has_gift_keyword = any(keyword in line for keyword in gift_keywords)
        if has_gift_keyword:
            continue
        result_lines.append(line)

# Write back
with open('api/views.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(result_lines))

print('Removed gift-related code from views.py')
