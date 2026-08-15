// --- Relative + absolute date formatter --------------------------------------
// Usage: DateFormatUtil.relative(timestamp) ? "2 hours ago", "Yesterday", "Jul 31"
class DateFormatUtil {
  static String relative(dynamic rawDate) {
    DateTime? dt;
    if (rawDate is int) {
      dt = DateTime.fromMillisecondsSinceEpoch(rawDate);
    } else if (rawDate is String) {
      final asInt = int.tryParse(rawDate);
      if (asInt != null) {
        dt = DateTime.fromMillisecondsSinceEpoch(asInt);
      } else {
        dt = DateTime.tryParse(rawDate);
      }
    } else if (rawDate is DateTime) {
      dt = rawDate;
    }

    if (dt == null) return '';
    final now  = DateTime.now();
    final diff = now.difference(dt);

    if (diff.inSeconds < 60)  return 'Just now';
    if (diff.inMinutes < 60)  return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)    return '${diff.inHours}h ago';
    if (diff.inDays == 1)     return 'Yesterday';
    if (diff.inDays < 7)      return '${diff.inDays} days ago';
    return absolute(dt);
  }

  static String absolute(DateTime dt) {
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final now    = DateTime.now();
    if (dt.year == now.year) {
      return '${months[dt.month - 1]} ${dt.day}';
    }
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  static String time(DateTime dt) {
    final h   = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m   = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }
}
