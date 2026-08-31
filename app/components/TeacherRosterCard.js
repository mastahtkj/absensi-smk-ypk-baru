'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';

// ⏰ SESI JAM PELAJARAN RESMI SMK YPK MEDAN (40 MENIT TIAP SESI + ISTIRAHAT SESUAI ASC TIMETABLES)
export const OFFICIAL_PERIOD_TIMES = {
  1: { time: '07:15 - 07:55', start: '07:15', end: '07:55', label: 'Les 1 (07:15 - 07:55)' },
  2: { time: '07:55 - 08:35', start: '07:55', end: '08:35', label: 'Les 2 (07:55 - 08:35)' },
  3: { time: '08:35 - 09:15', start: '08:35', end: '09:15', label: 'Les 3 (08:35 - 09:15)' },
  4: { time: '09:15 - 09:55', start: '09:15', end: '09:55', label: 'Les 4 (09:15 - 09:55)' },
  5: { time: '10:15 - 10:55', start: '10:15', end: '10:55', label: 'Les 5 (10:15 - 10:55)' },
  6: { time: '10:55 - 11:35', start: '10:55', end: '11:35', label: 'Les 6 (10:55 - 11:35)' },
  7: { time: '11:35 - 12:15', start: '11:35', end: '12:15', label: 'Les 7 (11:35 - 12:15)' },
  8: { time: '13:00 - 13:40', start: '13:00', end: '13:40', label: 'Les 8 (13:00 - 13:40)' },
  9: { time: '13:40 - 14:20', start: '13:40', end: '14:20', label: 'Les 9 (13:40 - 14:20)' },
  10: { time: '14:20 - 15:00', start: '14:20', end: '15:00', label: 'Les 10 (14:20 - 15:00)' },
  11: { time: '15:00 - 15:40', start: '15:00', end: '15:40', label: 'Les 11 (15:00 - 15:40)' },
};

// 🎯 FUNGSI KALKULASI WAKTU OTOMATIS BERDASARKAN ARRAY PERIODES (CONTOH: [1,2,3] -> '07:15 - 09:15')
export const getPeriodTimeRange = (periods = []) => {
  if (!periods || periods.length === 0) return '';
  const first = periods[0];
  const last = periods[periods.length - 1];
  const start = OFFICIAL_PERIOD_TIMES[first]?.start || '07:15';
  const end = OFFICIAL_PERIOD_TIMES[last]?.end || '15:40';
  return `${start} - ${end}`;
};

// 📚 MASTER DATA ROSTER RESMI 26 GURU SESUAI DOKUMEN aSc Timetables (PDF & GAMBAR RESMI)
export const OFFICIAL_TEACHER_ROSTERS = {
  // 1. Dra. Zubaidah (Page 1)
  zubaidah: {
    name: 'Dra. Zubaidah',
    fullName: 'DRA. ZUBAIDAH',
    inisial: 'ZB',
    title: 'Teacher Dra. Zubaidah',
    schedule: {
      Senin: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', kelas: 'XII PM / XII MPLB', mapel: 'PAI', ruangan: 'XII BM', color: '#2563eb' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', kelas: 'XI PM', mapel: 'PAI', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XII AKL', mapel: 'PAI', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI MPLB', mapel: 'PAI', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', kelas: 'XI AKL', mapel: 'PAI', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI TJKT', mapel: 'PAI', ruangan: 'R. Kelas', color: '#94a3b8' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XII MPLB / XII PM', mapel: 'PAI', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', kelas: 'XI MPLB', mapel: 'PAI', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XII TJKT', mapel: 'PAI', ruangan: 'R. Kelas', color: '#ef4444' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI AKL', mapel: 'PAI', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '10', periods: [10], waktu: '14:20 - 15:00', kelas: 'XII AKL', mapel: 'PAI', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', kelas: 'XII TJKT', mapel: 'PAI', ruangan: 'R. Kelas', color: '#ef4444' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XI PM', mapel: 'PAI', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', kelas: 'XI TJKT', mapel: 'PAI', ruangan: 'R. Kelas', color: '#94a3b8' },
      ],
      Sabtu: [],
    },
  },

  // 2. Arman Effendi, S.Ag (Page 2)
  arman: {
    name: 'Arman Effendi, S.Ag',
    fullName: 'ARMAN EFENDI, S.AG, MA',
    inisial: 'AP',
    title: 'Teacher Arman Effendi, S.Ag',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X TJKT', mapel: 'PAI', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X AKL', mapel: 'PAI', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', kelas: 'X MPLB', mapel: 'PAI', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XII AKL', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', kelas: 'X PM', mapel: 'PAI', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII PM / XII MPLB', mapel: 'Pend. Pancasila', ruangan: 'XII BM', color: '#2563eb' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X PM', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', kelas: 'X TJKT', mapel: 'PAI', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X AKL', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XI AKL', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', kelas: 'XI MPLB', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', kelas: 'X AKL', mapel: 'PAI', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI TJKT', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X TJKT', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#ea580c' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XII TJKT', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#ef4444' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X MPLB', mapel: 'PAI', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X PM', mapel: 'PAI', ruangan: 'R. Kelas', color: '#f97316' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI PM', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X MPLB', mapel: 'Pend. Pancasila', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  // 3. Neneng Gustanti, S.Pd (Page 3)
  neneng: {
    name: 'Neneng Gustanti, S.Pd',
    fullName: 'NENENG GUSTANTY, SPD.',
    inisial: 'NG',
    title: 'Teacher Neneng Gustanti, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', kelas: 'XI MPLB', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', kelas: 'XI PM', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'X PM', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', kelas: 'XI TJKT', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI AKL', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#bef264' },
      ],
      Selasa: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XII TJKT', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X MPLB', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X AKL', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X TJKT', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#ea580c' },
      ],
      Rabu: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X TJKT', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI MPLB', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X PM', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X MPLB', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XII AKL', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI TJKT', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', kelas: 'XI AKL', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI PM', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X AKL', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XII MPLB / XII PM', mapel: 'Bahasa Indonesia (B-IND)', ruangan: 'XII BM', color: '#0d9488' },
      ],
      Sabtu: [],
    },
  },

  // 4. Masdalifah Zahara, S.Pd (Page 4)
  masdalifah: {
    name: 'Masdalifah Zahara, S.Pd',
    fullName: 'MASDALIFAH ZAHARA SIREGAR,S.PD',
    inisial: 'MZ',
    title: 'Teacher Masdalifah Zahara, S.Pd',
    schedule: {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X TJKT', mapel: 'Seni Budaya (SBK)', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X PM', mapel: 'Seni Budaya (SBK)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X AKL', mapel: 'Seni Budaya (SBK)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X MPLB', mapel: 'Seni Budaya (SBK)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 5. Ricardo Agogo Sirait, ST, MSi (Page 5)
  ricardo: {
    name: 'Ricardo Agogo Sirait, ST, MSi',
    fullName: 'RICARDO AGOGO SIRAIT, ST.M.SI',
    inisial: 'RA',
    title: 'Teacher Ricardo Agogo Sirait, ST, MSi',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XI PM', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', kelas: 'XII TJKT', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X AKL', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XII AKL', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XII TJKT', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#ef4444' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X AKL', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X PM', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', kelas: 'X TJKT', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', kelas: 'XII AKL', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X TJKT', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X PM', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI PM', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X PM', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X TJKT', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Sabtu: [],
    },
  },

  // 6. Ir. Sofia Indriani Lbs, MPd (Page 6)
  sofia: {
    name: 'Ir. Sofia Indriani Lbs, MPd',
    fullName: 'HJ.SOFIA INDRIANI LUBIS,SP.M.PD',
    inisial: 'SI',
    title: 'Teacher Ir.Sofia Indriani Lbs, MPd',
    schedule: {
      Senin: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X PM', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', kelas: 'XI TJKT', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'X TJKT', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X MPLB', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Selasa: [],
      Rabu: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI TJKT', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X TJKT', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X MPLB', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X AKL', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X AKL', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X MPLB', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '9 - 10', periods: [9, 10], waktu: '13:40 - 15:00', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', kelas: 'XII MPLB / XII PM', mapel: 'Matematika (MM)', ruangan: 'XII BM', color: '#2563eb' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XII MPLB / XII PM', mapel: 'Matematika (MM)', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X PM', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X AKL', mapel: 'IPAS', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  // 7. Solawati Nainggolan, S.Pd, M.Pd (Page 7)
  solawati: {
    name: 'Solawati Nainggolan, S.Pd, M.Pd',
    fullName: 'SOLAWATI NAINGGOLAN,S.PD. M.PD',
    inisial: 'SN',
    title: 'Teacher Solawati Nainggolan. S.Pd, M.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X MPLB', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', kelas: 'XI AKL', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '7', periods: [7], waktu: '11:35 - 12:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI MPLB', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X MPLB', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', kelas: 'XI MPLB', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XI AKL', mapel: 'Matematika (MM)', ruangan: 'R. Kelas', color: '#bef264' },
      ],
      Sabtu: [],
    },
  },

  // 8. Dra. Roslin Panjaitan (Page 8)
  roslin: {
    name: 'Dra. Roslin Panjaitan',
    fullName: 'DRA. ROSLIN PANJAITAN',
    inisial: 'RP',
    title: 'Teacher Dra. Roslin Panjaitan',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI AKL', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XI MPLB', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'XII PM', mapel: 'MP-PM', ruangan: 'XII BM', color: '#2563eb' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI PM', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Selasa: [],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XI MPLB', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI AKL', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI PM', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 9. Tri Herdina Atika, S.Pd (Page 9)
  tri: {
    name: 'Tri Herdina Atika, S.Pd',
    fullName: 'TRI HERDINA ATIKA, S.PD',
    inisial: 'TH',
    title: 'Teacher Tri Herdina Atika, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X AKL', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X TJKT', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X PM', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X MPLB', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Selasa: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X TJKT', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X AKL', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X MPLB', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X PM', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 10. Rumaidin Sikumbang, S.Pd (Page 10)
  rumaidin: {
    name: 'Rumaidin Sikumbang, S.Pd',
    fullName: 'RUMAIDIN SIKUMBANG, S.PD.M.PD',
    inisial: 'RS',
    title: 'Teacher Rumaidin Sikumbang, S.Pd',
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XI PM', mapel: 'MP-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'XII TJKT', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#ef4444' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XI TJKT', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI PM', mapel: 'MP-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'XII MPLB / XII PM', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'XII BM', color: '#2563eb' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XII AKL', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XII MPLB / XII PM', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI TJKT', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#94a3b8' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII TJKT', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#ef4444' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XII AKL', mapel: 'Bahasa Inggris (B-ING)', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Sabtu: [],
    },
  },

  // 11. Fahrul Lubis, S.Pd (Page 11)
  fahrul: {
    name: 'Fahrul Lubis, S.Pd',
    fullName: 'FAHRUL LUBIS, SP.D',
    inisial: 'FL',
    title: 'Teacher Fahrul Lubis, S.Pd',
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'X AKL', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#06b6d4' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', kelas: 'X TJKT', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#ea580c' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', kelas: 'X PM', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#f97316' },
        { jamKe: '7', periods: [7], waktu: '11:35 - 12:15', kelas: 'X MPLB', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X MPLB', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI PM', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#06b6d4' },
      ],
      Rabu: [],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XI AKL', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#bef264' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X TJKT', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#ea580c' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X PM', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#f97316' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI MPLB', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI TJKT', mapel: 'PJOK (Olahraga)', ruangan: 'Lapangan', color: '#94a3b8' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 12. Elvi Rahimah Dalimunhe, S.Pd (Page 12)
  elvi: {
    name: 'Elvi Rahimah Dalimunhe, S.Pd',
    fullName: 'ELVI RAHIMAH DALIMUNTHE, S.PD',
    inisial: 'EV',
    title: 'Teacher Elvi Rahimah Dalimunhe, S.Pd',
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI MPLB', mapel: 'KKPI', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI AKL', mapel: 'KKPI', ruangan: 'Lab KKPI 3', color: '#bef264' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 13. Junaidi, SE (Page 13)
  junaidi: {
    name: 'Junaidi, SE',
    fullName: 'JUNAIDI, SE',
    inisial: 'JN',
    title: 'Teacher Junaidi, SE',
    schedule: {
      Senin: [],
      Selasa: [],
      Rabu: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI AKL', mapel: 'MP-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Kamis: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI AKL', mapel: 'MP-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XII AKL', mapel: 'MP-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Jumat: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  // 14. Sri astuti, S.Pd (Page 14)
  sri: {
    name: 'Sri Astuti, S.Pd',
    fullName: 'SRI ASTUTI, SP.D',
    inisial: 'SA',
    title: 'Teacher Sri astuti, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI PM', mapel: 'PKK', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Selasa: [],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'X AKL', mapel: 'DDAKL', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab KKPI 3', color: '#bef264' },
      ],
      Kamis: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'X PM', mapel: 'DDPM', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'XI PM', mapel: 'PKK', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', kelas: 'XII PM', mapel: 'PKK', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab KKPI 3', color: '#bef264' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XII PM', mapel: 'PKK', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X PM', mapel: 'DDPM', ruangan: 'R. Kelas', color: '#f97316' },
      ],
      Sabtu: [],
    },
  },

  // 15. Eliwati, S.Pd (Page 15)
  eliwati: {
    name: 'Eliwati, S.Pd',
    fullName: 'ELIWATI. S.PD',
    inisial: 'EW',
    title: 'Teacher Eliwati, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Selasa: [
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI AKL', mapel: 'PKK', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X PM', mapel: 'DDPM', ruangan: 'R. Kelas', color: '#f97316' },
      ],
      Rabu: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'X PM', mapel: 'DDPM', ruangan: 'R. Kelas', color: '#f97316' },
      ],
      Kamis: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X AKL', mapel: 'DDAKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XI AKL', mapel: 'PKK', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 16. Gusniaty Tanjung, S.Pd (Page 16)
  gusniati: {
    name: 'Gusniaty Tanjung, S.Pd',
    fullName: 'GUSNIATI, SPD. M.AK',
    inisial: 'GS',
    title: 'Teacher Gusniaty Tanjung, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'X AKL', mapel: 'DDAKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', kelas: 'XII AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X AKL', mapel: 'DDAKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X AKL', mapel: 'DDAKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XI AKL', mapel: 'KK-AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Sabtu: [],
    },
  },

  // 17. Aminah Nasution, SE (Page 17)
  aminah: {
    name: 'Aminah Nasution, SE',
    fullName: 'HJ. AMINAH NASUTION., SE',
    inisial: 'AN',
    title: 'Teacher Aminah Nasution, SE',
    schedule: {
      Senin: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X MPLB', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X AKL', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI AKL', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#bef264' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X PM', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XI PM', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'XII AKL', mapel: 'PKK', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI MPLB', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Rabu: [],
      Kamis: [
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XII AKL', mapel: 'PKK', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI TJKT', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#94a3b8' },
      ],
      Jumat: [
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X TJKT', mapel: 'Sejarah', ruangan: 'R. Kelas', color: '#ea580c' },
      ],
      Sabtu: [],
    },
  },

  // 18. Yenny, SE (Page 18)
  yenni: {
    name: 'Yenny, SE',
    fullName: 'Y E N N I, SE',
    inisial: 'YN',
    title: 'Teacher Yenny, SE',
    schedule: {
      Senin: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X TJKT', mapel: 'Informatika KKPI', ruangan: 'Lab KKPI 3', color: '#ea580c' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII TJKT', mapel: 'KKPI', ruangan: 'Lab KKPI 3', color: '#ef4444' },
      ],
      Selasa: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI TJKT', mapel: 'KKPI', ruangan: 'Lab KKPI 3', color: '#94a3b8' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XII AKL', mapel: 'KKPI', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'X AKL', mapel: 'Informatika KKPI', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII MPLB / XII PM', mapel: 'KKPI', ruangan: 'Lab TKJ 3', color: '#0d9488' },
      ],
      Kamis: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XI PM', mapel: 'KKPI', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  // 19. Erlinawati Tambunan, S.Pd (Page 19)
  erlinawati: {
    name: 'Erlinawati Tambunan, S.Pd',
    fullName: 'ERLINAWATI TAMBUNAN,S.PD',
    inisial: 'ET',
    title: 'Teacher Erlinawati Tambunan, S.Pd',
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X MPLB', mapel: 'Mengetik', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X AKL', mapel: 'Mengetik', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X PM', mapel: 'Mengetik', ruangan: 'Lab KKPI 3', color: '#f97316' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X TJKT', mapel: 'Mengetik', ruangan: 'Lab KKPI 3', color: '#ea580c' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 20. Mauli Simamora, S.Pd (Page 20)
  mauli: {
    name: 'Mauli Simamora, S.Pd',
    fullName: 'H.MAULI SIMAMORA, S.PD',
    inisial: 'MS',
    title: 'Teacher Mauli Simamora, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Rabu: [],
      Kamis: [
        { jamKe: '2', periods: [2], waktu: '07:55 - 08:35', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'X MPLB', mapel: 'DDMPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X MPLB', mapel: 'DDMPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Sabtu: [],
    },
  },

  // 21. Drs. Jafar Ismail (Page 21)
  jafar: {
    name: 'Drs. Jafar Ismail',
    fullName: 'DRS. JAFAR ISMAIL',
    inisial: 'JI',
    title: 'Teacher Drs. Jafar Ismail',
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', kelas: 'XII MPLB', mapel: 'PKK', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X MPLB', mapel: 'DDMPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X MPLB', mapel: 'DDMPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XII MPLB', mapel: 'PKK', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 22. Juraidah Hasibuan, S.Pd (Page 22)
  juraidah: {
    name: 'Juraidah Hasibuan, S.Pd',
    fullName: 'HJ.JURAIDAH HASIBUAN,S.PD',
    inisial: 'JU',
    title: 'Teacher Juraidah Hasibuan, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XII MPLB', mapel: 'MP-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI MPLB', mapel: 'PKK', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', kelas: 'XI MPLB', mapel: 'PKK', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  // 23. Azizah Simanjuntak, S.Pd (Page 23)
  azizah: {
    name: 'Azizah Simanjuntak, S.Pd',
    fullName: 'AZIZAH SIMANJUNTAK, SP.D',
    inisial: 'AZ',
    title: 'Teacher Azizah Simanjuntak, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X MPLB', mapel: 'DDMPLB', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X PM', mapel: 'DDPM', ruangan: 'R. Kelas', color: '#f97316' },
      ],
      Selasa: [
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X PM', mapel: 'DDPM', ruangan: 'R. Kelas', color: '#f97316' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X MPLB', mapel: 'DDMPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XII MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab TKJ 3', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
      ],
      Kamis: [
        { jamKe: '2 - 5', periods: [2, 3, 4, 5], waktu: '07:55 - 10:55', kelas: 'XI MPLB', mapel: 'MP-MPLB', ruangan: 'Lab TKJ 3', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XI MPLB', mapel: 'KK-MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  // 24. Hendrawan, ST (Page 24)
  hendrawan: {
    name: 'Hendrawan, ST',
    fullName: 'HENDRAWAN, ST',
    inisial: 'HR',
    title: 'Teacher Hendrawan, ST',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XII TJKT', mapel: 'MP-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XI PM', mapel: 'KK-PM', ruangan: 'Lab TKJ 2', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Kamis: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XII PM', mapel: 'KK-PM', ruangan: 'Lab TKJ 2', color: '#2563eb' },
      ],
      Jumat: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Sabtu: [],
    },
  },

  // 25. M. Iqbal Rangkuti, S.Kom (Page 25)
  iqbal: {
    name: 'M. Iqbal Rangkuti, S.Kom',
    fullName: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
    inisial: 'IR',
    title: 'Teacher M. Iqbal Rangkuti, S.Kom',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', kelas: 'XI TJKT', mapel: 'MP-TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'X TJKT', mapel: 'DDTJKT', ruangan: 'Lab TKJ 2', color: '#ea580c' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', kelas: 'X TJKT', mapel: 'DDTJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 1', color: '#ef4444' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XI TJKT', mapel: 'MP-TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X TJKT', mapel: 'DDTJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
      ],
      Sabtu: [],
    },
  },

  // 26. Ahmad Fauzi, S.Kom (Page 26)
  fauzi: {
    name: 'Ahmad Fauzi, S.Kom',
    fullName: 'AHMAD FAUZI,S.KOM., Gr.',
    inisial: 'AF',
    title: 'Teacher Ahmad Fauzi, S.Kom',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'X PM', mapel: 'Informatika KKPI', ruangan: 'Lab TKJ 3', color: '#f97316' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', kelas: 'XI TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', kelas: 'XII TJKT', mapel: 'KK-TJKT', ruangan: 'Lab TKJ 1', color: '#ef4444' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', kelas: 'X MPLB', mapel: 'Informatika Coding', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'PIKET GURU', mapel: 'Tugas Piket Harian', ruangan: 'R. Piket', color: '#ef4444', isPiket: true },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', kelas: 'XI TJKT', mapel: 'PKK', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', kelas: 'X PM', mapel: 'Informatika Coding', ruangan: 'Lab TKJ 3', color: '#f97316' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'XI TJKT', mapel: 'PKK', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X TJKT', mapel: 'DDTJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'XII TJKT', mapel: 'PKK', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Kamis: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', kelas: 'X TJKT', mapel: 'Informatika Coding', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', kelas: 'X TJKT', mapel: 'DDTJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', kelas: 'X AKL', mapel: 'Informatika Coding', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', kelas: 'XII TJKT', mapel: 'PKK', ruangan: 'Lab TKJ 3', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', kelas: 'X MPLB', mapel: 'Informatika KKPI', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },
};

// 🔍 MAPPING RFID & USERNAME DARI DATABASE TB_GURU KE HALAMAN ROSTER RESMI
export const TB_GURU_MAPPING = {
  // id, username, inisial, rfid, page, key
  '13': { key: 'zubaidah', page: 1, inisial: 'ZB', username: 'zubaidah', rfid: '4C05DA05' },
  '15': { key: 'arman', page: 2, inisial: 'AP', username: 'arman', rfid: '8970D705' },
  '16': { key: 'neneng', page: 3, inisial: 'NG', username: 'neneng', rfid: 'FA39D805' },
  '30': { key: 'masdalifah', page: 4, inisial: 'MZ', username: 'masdalifah', rfid: '0D2ED805' },
  '12': { key: 'ricardo', page: 5, inisial: 'RA', username: 'ricardo', rfid: '931ED805' },
  '17': { key: 'sofia', page: 6, inisial: 'SI', username: 'sofia', rfid: 'FE0ED705' },
  '25': { key: 'solawati', page: 7, inisial: 'SN', username: 'solawati', rfid: 'F67FD805' },
  '18': { key: 'roslin', page: 8, inisial: 'RP', username: 'roslin', rfid: '1329D705' },
  '20': { key: 'tri', page: 9, inisial: 'TH', username: 'tri', rfid: '0744D905' },
  '21': { key: 'rumaidin', page: 10, inisial: 'RS', username: 'rumaidin', rfid: '63EBD805' },
  '26': { key: 'fahrul', page: 11, inisial: 'FL', username: 'fahrul', rfid: '75B5DA05' },
  '23': { key: 'elvi', page: 12, inisial: 'EV', username: 'elvi', rfid: 'E57ED705' },
  '22': { key: 'junaidi', page: 13, inisial: 'JN', username: 'junaidi', rfid: '2948D805' },
  '14': { key: 'sri', page: 14, inisial: 'SA', username: 'sri', rfid: '2A76D805' },
  '6': { key: 'eliwati', page: 15, inisial: 'EW', username: 'eliwati', rfid: '452ED805' },
  '24': { key: 'gusniati', page: 16, inisial: 'GS', username: 'gusniati', rfid: '227BD705' },
  '19': { key: 'aminah', page: 17, inisial: 'AN', username: 'aminah', rfid: '1B1ED905' },
  '4': { key: 'yenni', page: 18, inisial: 'YN', username: 'yenni', rfid: 'DB1FD705' },
  '8': { key: 'erlinawati', page: 19, inisial: 'ET', username: 'erlinawati', rfid: '5CBCDB05' },
  '10': { key: 'mauli', page: 20, inisial: 'MS', username: 'mauli', rfid: '9CC2DA05' },
  '5': { key: 'jafar', page: 21, inisial: 'JI', username: 'jafar', rfid: 'AA1BDB05' },
  '11': { key: 'juraidah', page: 22, inisial: 'JU', username: 'juraidah', rfid: 'ABE3D705' },
  '7': { key: 'azizah', page: 23, inisial: 'AZ', username: 'azizah', rfid: '57BED805' },
  '3': { key: 'hendrawan', page: 24, inisial: 'HR', username: 'hendrawan', rfid: 'BADFD805' },
  '29': { key: 'iqbal', page: 25, inisial: 'IR', username: 'iqbal', rfid: '92006F96' },
  '27': { key: 'fauzi', page: 26, inisial: 'AF', username: 'fauzi', rfid: '990BD705' },
};

// 🔍 HELPER AUTO-MATCHING GURU DENGAN DATA ROSTER RESMI
export function matchTeacherRoster(currentUser, siswaList = []) {
  if (!currentUser) return null;

  const currentRfid = String(
    currentUser?.uid_rfid || currentUser?.rfid_uid || currentUser?.rfid || ''
  ).trim().toUpperCase();

  const currentUsername = String(currentUser?.username || '').trim().toLowerCase();
  const currentInisial = String(currentUser?.inisial || '').trim().toUpperCase();
  const currentNama = String(currentUser?.nama || currentUser?.nama_guru || '').trim().toLowerCase();
  const currentRawId = String(currentUser?.rawId || currentUser?.id || '').replace(/\D/g, '');

  // 1. Cek kecocokan berdasarkan UID RFID
  if (currentRfid) {
    for (const [id, meta] of Object.entries(TB_GURU_MAPPING)) {
      if (meta.rfid && currentRfid.includes(meta.rfid)) {
        const roster = OFFICIAL_TEACHER_ROSTERS[meta.key];
        if (roster) return { key: meta.key, roster: { ...roster, page: meta.page } };
      }
    }
  }

  // 2. Cek kecocokan berdasarkan ID Guru di database
  if (currentRawId && TB_GURU_MAPPING[currentRawId]) {
    const meta = TB_GURU_MAPPING[currentRawId];
    const roster = OFFICIAL_TEACHER_ROSTERS[meta.key];
    if (roster) return { key: meta.key, roster: { ...roster, page: meta.page } };
  }

  // 3. Cek kecocokan berdasarkan Username
  if (currentUsername) {
    for (const [id, meta] of Object.entries(TB_GURU_MAPPING)) {
      if (meta.username === currentUsername) {
        const roster = OFFICIAL_TEACHER_ROSTERS[meta.key];
        if (roster) return { key: meta.key, roster: { ...roster, page: meta.page } };
      }
    }
  }

  // 4. Cek kecocokan berdasarkan Inisial Guru (e.g. ZB, AP, NG, RA, SI, RP, IR, AF)
  if (currentInisial) {
    for (const [id, meta] of Object.entries(TB_GURU_MAPPING)) {
      if (meta.inisial === currentInisial) {
        const roster = OFFICIAL_TEACHER_ROSTERS[meta.key];
        if (roster) return { key: meta.key, roster: { ...roster, page: meta.page } };
      }
    }
  }

  // 5. Cek kecocokan nama guru
  for (const [id, meta] of Object.entries(TB_GURU_MAPPING)) {
    const roster = OFFICIAL_TEACHER_ROSTERS[meta.key];
    if (!roster) continue;
    const rName = roster.name.toLowerCase();
    const rFullName = roster.fullName.toLowerCase();
    if (
      currentNama.includes(meta.key) ||
      currentNama.includes(rName) ||
      rName.includes(currentNama) ||
      rFullName.includes(currentNama)
    ) {
      return { key: meta.key, roster: { ...roster, page: meta.page } };
    }
  }

  // Default fallback ke Iqbal / Guru pertama
  const defaultMeta = TB_GURU_MAPPING['29'] || { key: 'iqbal', page: 25 };
  const fallbackRoster = OFFICIAL_TEACHER_ROSTERS[defaultMeta.key];
  return {
    key: defaultMeta.key,
    roster: { ...fallbackRoster, page: defaultMeta.page },
  };
}

export default function TeacherRosterCard({ currentUser, siswaList = [] }) {
  // Mencocokkan guru dengan database roster resmi
  const matched = useMemo(() => {
    return matchTeacherRoster(currentUser, siswaList);
  }, [currentUser, siswaList]);

  const [modalTeacherKey, setModalTeacherKey] = useState(matched?.key || 'iqbal');

  // Update modalTeacherKey saat matched berubah
  React.useEffect(() => {
    if (matched?.key) {
      setModalTeacherKey(matched.key);
    }
  }, [matched?.key]);

  const activeRosterKey = modalTeacherKey || matched?.key || 'iqbal';
  const activeModalRoster = OFFICIAL_TEACHER_ROSTERS[activeRosterKey] || matched?.roster;

  const teacherRoster = matched?.roster;
  const teacherName = currentUser?.nama || teacherRoster?.fullName || teacherRoster?.name || 'Guru Pengajar';
  const teacherInisial = teacherRoster?.inisial || currentUser?.inisial || 'GR';

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Hari hari ini
  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = daysMap[new Date().getDay()] || 'Senin';
  const initialActiveDay = todayName === 'Minggu' || todayName === 'Sabtu' ? 'Senin' : todayName;

  const [selectedDay, setSelectedDay] = useState(initialActiveDay);

  const weeklySchedule = teacherRoster?.schedule || {};
  const daySchedule = weeklySchedule[selectedDay] || [];

  // Kalkulasi total jam mengajar minggu ini
  const totalWeeklySessions = useMemo(() => {
    let count = 0;
    Object.values(weeklySchedule).forEach((daySlots) => {
      (daySlots || []).forEach((slot) => {
        if (!slot.isPiket) {
          count += (slot.periods || []).length || 1;
        }
      });
    });
    return count;
  }, [weeklySchedule]);

  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  return (
    <div
      className="stardust-white-card"
      style={{
        borderRadius: '16px',
        padding: '16px 18px',
        border: '1.5px solid #fed7aa',
        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.08)',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* HEADER WIDGET ROSTER GURU */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #ffedd5',
          paddingBottom: '12px',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '19px',
              boxShadow: '0 3px 8px rgba(234, 88, 12, 0.3)',
              flexShrink: 0,
            }}
          >
            📅
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                Jadwal Mengajar &amp; Roster
              </h3>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  letterSpacing: '0.5px',
                }}
              >
                [ {teacherInisial} ]
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  backgroundColor: '#ffedd5',
                  color: '#9a3412',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                }}
              >
                {totalWeeklySessions} Jam Pelajaran
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Nama Guru: <b style={{ color: '#c2410c' }}>{teacherName}</b>
            </p>
          </div>
        </div>

        {/* TOMBOL AKSI LIHAT MATRIKS LENGKAP */}
        <div>
          <button
            type="button"
            onClick={() => {
              setModalTeacherKey(matched?.key || 'iqbal');
              setIsModalOpen(true);
            }}
            style={{
              backgroundColor: '#fff7ed',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '11.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📑</span>
            <span>Matriks Roster Mingguan</span>
          </button>
        </div>
      </div>

      {/* PILIH HARI JADWAL (SENIN - JUM'AT) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '6px',
          marginBottom: '10px',
          scrollbarWidth: 'none',
        }}
      >
        {daysList.map((day) => {
          const isSelected = selectedDay === day;
          const isToday = todayName === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                backgroundColor: isSelected ? '#ea580c' : '#fff7ed',
                color: isSelected ? '#ffffff' : '#9a3412',
                border: `1px solid ${isSelected ? '#ea580c' : '#fed7aa'}`,
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: isSelected ? 'bold' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isSelected ? '0 2px 6px rgba(234, 88, 12, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{day}</span>
              {isToday && (
                <span
                  style={{
                    fontSize: '8.5px',
                    backgroundColor: isSelected ? '#ffffff' : '#16a34a',
                    color: isSelected ? '#ea580c' : '#ffffff',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  Hari Ini
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* LIST KARTU MENGAJAR HARI TERPILIH */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {daySchedule.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              backgroundColor: '#fff7ed',
              borderRadius: '12px',
              color: '#9a3412',
              fontSize: '12px',
            }}
          >
            ☕ Tidak ada jadwal mengajar atau piket pada hari <b>{selectedDay}</b>.
          </div>
        ) : (
          daySchedule.map((slot, idx) => {
            const isPiket = slot.isPiket;
            const slotColor = isPiket ? '#ef4444' : slot.color || '#3b82f6';

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${isPiket ? '#fecaca' : '#fed7aa'}`,
                  borderLeft: `4px solid ${slotColor}`,
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      backgroundColor: slotColor,
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textAlign: 'center',
                      minWidth: '55px',
                    }}
                  >
                    Jam {slot.jamKe}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                        {slot.kelas}
                      </h4>
                      {isPiket ? (
                        <span style={{ fontSize: '9.5px', color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                          Tugas Piket Harian
                        </span>
                      ) : (
                        <span style={{ fontSize: '9.5px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                          {slot.ruangan || 'R. Kelas'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '1px 0 0 0', fontSize: '11.5px', color: '#475569' }}>
                      {slot.mapel}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ea580c', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '6px' }}>
                    🕒 {getPeriodTimeRange(slot.periods) || slot.waktu} WIB
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📑 MODAL LIGHTBOX MATRIKS ROSTER DIGITAL LENGKAP */}
      {isModalOpen && (
        <div
          className="no-swipe modal-container"
          data-no-swipe="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsModalOpen(false)}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div
            className="no-swipe"
            data-no-swipe="true"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              maxWidth: '960px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '20px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
                marginBottom: '14px',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      color: '#ea580c',
                      backgroundColor: '#ffedd5',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    SMK YPK MEDAN • AKREDITASI A
                  </span>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>
                    Sistem Roster Resmi aSc Timetables
                  </span>
                </div>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>
                  Matriks Jadwal: {activeModalRoster?.fullName || activeModalRoster?.name} [{activeModalRoster?.inisial}]
                </h3>
              </div>

              {/* GURU SELECTOR & CLOSE BUTTON */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={modalTeacherKey}
                  onChange={(e) => setModalTeacherKey(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #fed7aa',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    color: '#9a3412',
                    backgroundColor: '#fff7ed',
                    cursor: 'pointer',
                  }}
                >
                  {Object.entries(OFFICIAL_TEACHER_ROSTERS).map(([k, r]) => (
                    <option key={k} value={k}>
                      {r.fullName || r.name} [{r.inisial}]
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px 6px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MODAL BODY: aSc TIMETABLE VISUAL GRID TABLE */}
            <div>
              <div
                className="no-swipe"
                data-no-swipe="true"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ overflowX: 'auto', marginBottom: '16px', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#ffffff' }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', minWidth: '760px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                      <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 8px', minWidth: '70px', boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>
                        Hari
                      </th>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => (
                        <th key={p} style={{ border: '1px solid #cbd5e1', padding: '6px 4px', minWidth: '65px' }}>
                          <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a' }}>{p}</div>
                          <div style={{ fontSize: '8px', color: '#475569', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            {OFFICIAL_PERIOD_TIMES[p]?.time || OFFICIAL_PERIOD_TIMES[p]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                      const slots = activeModalRoster?.schedule?.[day] || [];
                      return (
                        <tr key={day} style={{ height: '54px' }}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 5, border: '1px solid #cbd5e1', fontWeight: '800', backgroundColor: '#f8fafc', color: '#1e293b', padding: '6px', boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>
                            {day}
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => {
                            const matchSlot = slots.find((s) => (s.periods || []).includes(p));

                            if (!matchSlot) {
                              return (
                                <td key={p} style={{ border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }} />
                              );
                            }

                            const isStartPeriod = (matchSlot.periods || [])[0] === p;
                            if (!isStartPeriod) return null;

                            const colSpan = (matchSlot.periods || []).length || 1;

                            return (
                              <td
                                key={p}
                                colSpan={colSpan}
                                style={{
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: matchSlot.isPiket ? '#ef4444' : matchSlot.color || '#3b82f6',
                                  color: '#ffffff',
                                  padding: '5px 4px',
                                  fontWeight: 'bold',
                                  lineHeight: 1.2,
                                }}
                              >
                                <div style={{ fontSize: '11px', fontWeight: '900' }}>{matchSlot.kelas}</div>
                                <div style={{ fontSize: '8.5px', opacity: 0.95 }}>
                                  {matchSlot.mapel} {matchSlot.ruangan && matchSlot.ruangan !== 'R. Kelas' ? `• ${matchSlot.ruangan}` : ''}
                                </div>
                                <div style={{ fontSize: '7.5px', opacity: 0.9, marginTop: '2px', backgroundColor: 'rgba(0,0,0,0.22)', padding: '1px 4px', borderRadius: '3px', display: 'inline-block' }}>
                                  🕒 {getPeriodTimeRange(matchSlot.periods)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10.5px',
                  color: '#64748b',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span>Sistem Matriks aSc Timetables • <b>SMK YPK MEDAN</b></span>
                <span>Akreditasi A • TA 2026/2027</span>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                borderTop: '1px solid #f1f5f9',
                paddingTop: '14px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 24px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
