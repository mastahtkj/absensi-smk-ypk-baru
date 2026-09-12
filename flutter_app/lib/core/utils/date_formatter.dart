import 'package:intl/intl.dart';

class DateFormatter {
  static final DateFormat _dateFormat = DateFormat('EEEE, d MMMM yyyy', 'id_ID');
  static final DateFormat _shortDateFormat = DateFormat('d MMM yyyy', 'id_ID');
  static final DateFormat _timeFormat = DateFormat('HH:mm', 'id_ID');
  static final DateFormat _isoDateFormat = DateFormat('yyyy-MM-dd');

  /// Format: "Senin, 13 September 2026"
  static String formatFullDate(DateTime dateTime) {
    try {
      return _dateFormat.format(dateTime.toLocal());
    } catch (e) {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }

  /// Format: "13 Sep 2026"
  static String formatShortDate(DateTime dateTime) {
    try {
      return _shortDateFormat.format(dateTime.toLocal());
    } catch (e) {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }

  /// Format: "07:25 WIB"
  static String formatTime(DateTime dateTime) {
    try {
      return '${_timeFormat.format(dateTime.toLocal())} WIB';
    } catch (e) {
      return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')} WIB';
    }
  }

  /// Format: "2026-09-13" (Digunakan untuk filter query database Supabase)
  static String formatIsoDate(DateTime dateTime) {
    return _isoDateFormat.format(dateTime.toLocal());
  }
}
