import os

def update_tutor_cards():
    path = r'c:\Users\Admin\Desktop\WEB\src\lib\admin-dashboard.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_signature = """export async function getPublicTutorCards(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
}) {"""

    new_signature = """export async function getPublicTutorCards(filters: {
  subject?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
  language?: string;
  isVerified?: boolean;
}) {"""

    old_where = """    where: {
      verificationStatus: { in: ['APPROVED', 'PENDING'] },
      hiddenFromSearch: false,
      user: {
        isBanned: false,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }],
      },
      ...(filters.subject ? { specializations: { has: filters.subject as any } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            hourlyRate: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
      ...(filters.minRating !== undefined ? { rating: { gte: filters.minRating } } : {}),
    },
    include: {
      user: true,
      certifications: true,
    },"""

    new_where = """    where: {
      verificationStatus: filters.isVerified ? 'APPROVED' : { in: ['APPROVED', 'PENDING'] },
      hiddenFromSearch: false,
      user: {
        isBanned: false,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }],
      },
      ...(filters.subject ? { specializations: { has: filters.subject as any } } : {}),
      ...(filters.language ? { languages: { has: filters.language } } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            hourlyRate: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
      ...(filters.minRating !== undefined ? { rating: { gte: filters.minRating } } : {}),
    },
    include: {
      user: true,
      certifications: true,
      availability: true,
    },"""

    # Normalize line endings for replacement
    content = content.replace('\r\n', '\n')
    old_signature = old_signature.replace('\r\n', '\n')
    new_signature = new_signature.replace('\r\n', '\n')
    old_where = old_where.replace('\r\n', '\n')
    new_where = new_where.replace('\r\n', '\n')

    if old_signature in content:
        content = content.replace(old_signature, new_signature)
        print("Updated function signature")
    else:
        print("Could not find old signature")

    if old_where in content:
        content = content.replace(old_where, new_where)
        print("Updated where and include clause")
    else:
        print("Could not find old where clause")

    with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(content)

if __name__ == "__main__":
    update_tutor_cards()
