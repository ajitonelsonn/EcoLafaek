import 'package:intl/intl.dart';

// Format date for report display
String formatReportDate(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final yesterday = today.subtract(const Duration(days: 1));
  final reportDate = DateTime(date.year, date.month, date.day);
  
  if (reportDate == today) {
    return 'Today, ${DateFormat.jm().format(date)}';
  } else if (reportDate == yesterday) {
    return 'Yesterday, ${DateFormat.jm().format(date)}';
  } else if (now.difference(date).inDays < 7) {
    return '${DateFormat.EEEE().format(date)}, ${DateFormat.jm().format(date)}';
  } else {
    return DateFormat.yMMMd().format(date);
  }
}

// Format full date and time
String formatFullDateTime(DateTime date) {
  return DateFormat('MMM d, y - h:mm a').format(date);
}

// Format time only
String formatTime(DateTime date) {
  return DateFormat.jm().format(date);
}

// Format relative time (e.g., "2 hours ago")
String formatRelativeTime(DateTime date) {
  final now = DateTime.now();
  final difference = now.difference(date);
  
  if (difference.inSeconds < 60) {
    return 'Just now';
  } else if (difference.inMinutes < 60) {
    return '${difference.inMinutes} ${difference.inMinutes == 1 ? 'minute' : 'minutes'} ago';
  } else if (difference.inHours < 24) {
    return '${difference.inHours} ${difference.inHours == 1 ? 'hour' : 'hours'} ago';
  } else if (difference.inDays < 7) {
    return '${difference.inDays} ${difference.inDays == 1 ? 'day' : 'days'} ago';
  } else if (difference.inDays < 30) {
    final weeks = (difference.inDays / 7).floor();
    return '$weeks ${weeks == 1 ? 'week' : 'weeks'} ago';
  } else if (difference.inDays < 365) {
    final months = (difference.inDays / 30).floor();
    return '$months ${months == 1 ? 'month' : 'months'} ago';
  } else {
    final years = (difference.inDays / 365).floor();
    return '$years ${years == 1 ? 'year' : 'years'} ago';
  }
}