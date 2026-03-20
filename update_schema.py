import sys
import os

def update_schema():
    path = r'c:\Users\Admin\Desktop\WEB\prisma\schema.prisma'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Update User model
    user_search = '  receivedStrikes           UserStrike[]          @relation("StrikeRecipient")'
    user_replace = user_search + '\n\n  // Student Experience Relations\n  studentPreference           StudentPreference?\n  savedTutors                 StudentSavedTutor[]\n  bookingPackages             BookingPackage[]\n  referralsMade               Referral[]            @relation("Referrer")\n  referralReceived            Referral?             @relation("Referred")\n  credits                     StudentCredit[]\n  notificationPreferences     NotificationPreference[]'
    
    if user_search in content:
        content = content.replace(user_search, user_replace)
        print("Updated User model")
    else:
        # Try with a more flexible search if the exact string fails
        print("Exact match failed for User model, trying flexible match...")
        if 'receivedStrikes' in content and 'relation("StrikeRecipient")' in content:
             print("Found part of the string, but not exact. Please check formatting.")
        else:
             print("Could not find TargetContent in User model")

    # Update Review model
    review_search = '  createdAt      DateTime     @default(now())'
    review_replace = review_search + '\n  tags           ReviewTag[]'
    
    if review_search in content:
        content = content.replace(review_search, review_replace)
        print("Updated Review model")
    else:
        print("Could not find TargetContent in Review model")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    update_schema()
