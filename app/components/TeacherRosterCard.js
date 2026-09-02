'use client';

import React, { useState, useMemo } from 'react';

// 🕒 DAFTAR JAM PELAJARAN RESMI SMK YPK MEDAN (SENIN - JUM'AT)
export const OFFICIAL_PERIOD_TIMES = {
  1: { time: '07:15 - 07:55', label: '07:15 - 07:55', start: '07:15', end: '07:55' },
  2: { time: '07:55 - 08:35', label: '07:55 - 08:35', start: '07:55', end: '08:35' },
  3: { time: '08:35 - 09:15', label: '08:35 - 09:15', start: '08:35', end: '09:15' },
  4: { time: '09:15 - 09:55', label: '09:15 - 09:55', start: '09:15', end: '09:55' },
  5: { time: '10:15 - 10:55', label: '10:15 - 10:55', start: '10:15', end: '10:55' },
  6: { time: '10:55 - 11:35', label: '10:55 - 11:35', start: '10:55', end: '11:35' },
  7: { time: '11:35 - 12:15', label: '11:35 - 12:15', start: '11:35', end: '12:15' },
  8: { time: '13:00 - 13:40', label: '13:00 - 13:40', start: '13:00', end: '13:40' },
  9: { time: '13:40 - 14:20', label: '13:40 - 14:20', start: '13:40', end: '14:20' },
  10: { time: '14:20 - 15:00', label: '14:20 - 15:00', start: '14:20', end: '15:00' },
  11: { time: '15:00 - 15:40', label: '15:00 - 15:40', start: '15:00', end: '15:40' },
};

// 🕒 HELPER RENTANG WAKTU OTOMATIS BERDASARKAN PERIOD LES
export const getPeriodTimeRange = (periods = []) => {
  if (!periods || periods.length === 0) return '';
  const first = periods[0];
  const last = periods[periods.length - 1];
  const start = OFFICIAL_PERIOD_TIMES[first]?.start || '07:15';
  const end = OFFICIAL_PERIOD_TIMES[last]?.end || '15:40';
  return `${start} - ${end}`;
};

// 📚 DATA MASTER ROSTER GURU RESMI DARI ASC TIMETABLES (26 GURU + PIKET)
export const OFFICIAL_TEACHER_ROSTERS = {
  'AP': {
    code: 'AP',
    name: 'Arman Effendi, S.Ag',
    page: 1,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'PAI', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'PAI', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'PAI', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', mapel: 'PAI', kelas: 'X PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Pendidikan Pancasila', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Pendidikan Pancasila', kelas: 'X PM', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'PAI', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Pendidikan Pancasila', kelas: 'X AKL', ruangan: 'R. Teori', color: '#84cc16' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Pendidikan Pancasila', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'Pendidikan Pancasila', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'PAI', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Pendidikan Pancasila', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Pendidikan Pancasila', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Pendidikan Pancasila', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'PAI', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PAI', kelas: 'X PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Pendidikan Pancasila', kelas: 'XI PM', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Pendidikan Pancasila', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  'SN': {
    code: 'SN',
    name: 'Solawati Nainggolan, S.Pd',
    page: 2,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', mapel: 'Matematika (MM)', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Matematika (MM)', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#22c55e' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', mapel: 'Matematika (MM)', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#22c55e' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Matematika (MM)', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#22c55e' },
      ],
      Sabtu: [],
    },
  },

  'AN': {
    code: 'AN',
    name: 'Aminah Nasution, SE',
    page: 3,
    schedule: {
      Senin: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Sejarah', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Sejarah', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Sejarah', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Sejarah', kelas: 'X PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Sejarah', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'PKK', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Sejarah', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Rabu: [],
      Kamis: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PKK', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Sejarah', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Sejarah', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'AZ': {
    code: 'AZ',
    name: 'Azizah Simanjuntak, S.Pd',
    page: 4,
    schedule: {
      Senin: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'DDMPLB', kelas: 'X MPLB', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDPM', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
      ],
      Selasa: [
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'DDPM', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDMPLB', kelas: 'X MPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab TKJ 3', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '2 - 5', periods: [2, 3, 4, 5], waktu: '07:55 - 10:55', mapel: 'MP-MPLB', kelas: 'XI MPLB', ruangan: 'Lab TKJ 3', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  'TH': {
    code: 'TH',
    name: 'Tri Herdina Atika, S.Pd',
    page: 5,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X PM', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#6366f1' },
      ],
      Selasa: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#6366f1' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'X PM', ruangan: 'R. Teori', color: '#6366f1' },
      ],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    },
  },

  'SI': {
    code: 'SI',
    name: 'Ir. Sofia Indriani Lbs, MPd',
    page: 6,
    schedule: {
      Senin: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Matematika (MM)', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'Matematika (MM)', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#94a3b8' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'Matematika (MM)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'IPAS', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Selasa: [],
      Rabu: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Matematika (MM)', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#94a3b8' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Matematika (MM)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#ea580c' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'IPAS', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'IPAS', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'IPAS', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'IPAS', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', mapel: 'Matematika (MM)', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#0d9488' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Matematika (MM)', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'IPAS', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'AF': {
    code: 'AF',
    name: 'Ahmad Fauzi, S.Kom',
    page: 7,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Informatika KKPI', kelas: 'X PM', ruangan: 'Lab TKJ 3', color: '#f97316' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 1', color: '#ef4444' },
      ],
      Selasa: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Informatika Coding', kelas: 'X MPLB', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'PKK', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Informatika Coding', kelas: 'X PM', ruangan: 'Lab TKJ 3', color: '#f97316' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PKK', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'DDTJKT', kelas: 'X TJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PKK', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Kamis: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Informatika Coding', kelas: 'X TJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'DDTJKT', kelas: 'X TJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Informatika Coding', kelas: 'X AKL', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'PKK', kelas: 'XII TJKT', ruangan: 'Lab TKJ 3', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Informatika KKPI', kelas: 'X MPLB', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'NG': {
    code: 'NG',
    name: 'Neneng Gustanti, S.Pd',
    page: 8,
    schedule: {
      Senin: [
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI PM', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X PM', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Selasa: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Rabu: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X PM', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#4ade80' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '8', periods: [8], waktu: '13:00 - 13:40', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XI PM', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Jumat: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#4ade80' },
      ],
      Sabtu: [],
    },
  },

  'FL': {
    code: 'FL',
    name: 'Fahrul Lubis, S.Pd',
    page: 9,
    schedule: {
      Senin: [
        { jamKe: '1 - 11', periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], waktu: '07:15 - 15:40', mapel: 'Guru Piket', kelas: 'Semua Kelas', ruangan: 'Pos Piket', color: '#64748b' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'PJOK / Olahraga', kelas: 'X AKL', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'PJOK / Olahraga', kelas: 'X TJKT', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'PJOK / Olahraga', kelas: 'X PM', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'PJOK / Olahraga', kelas: 'X MPLB', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PJOK / Olahraga', kelas: 'XI PM', ruangan: 'Lapangan', color: '#64748b' },
      ],
      Rabu: [
        { jamKe: '1 - 11', periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], waktu: '07:15 - 15:40', mapel: 'Guru Piket', kelas: 'Semua Kelas', ruangan: 'Pos Piket', color: '#64748b' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'PJOK / Olahraga', kelas: 'XI AKL', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PJOK / Olahraga', kelas: 'X TJKT', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PJOK / Olahraga', kelas: 'X PM', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'PJOK / Olahraga', kelas: 'XI MPLB', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PJOK / Olahraga', kelas: 'XI TJKT', ruangan: 'Lapangan', color: '#64748b' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  'JI': {
    code: 'JI',
    name: 'Drs. Jafar Ismail',
    page: 10,
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', mapel: 'PKK', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'DDMPLB', kelas: 'X MPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'DDMPLB', kelas: 'X MPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'PKK', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  'ET': {
    code: 'ET',
    name: 'Erlinawati Tambunan, S.Pd',
    page: 11,
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Mengetik', kelas: 'X MPLB', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Mengetik', kelas: 'X AKL', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Mengetik', kelas: 'X PM', ruangan: 'Lab KKPI 3', color: '#f97316' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Mengetik', kelas: 'X TJKT', ruangan: 'Lab KKPI 3', color: '#ea580c' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  'MS': {
    code: 'MS',
    name: 'Mauli Simamora, S.Pd',
    page: 12,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Rabu: [],
      Kamis: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'DDMPLB', kelas: 'X MPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'DDMPLB', kelas: 'X MPLB', ruangan: 'Lab MPLB', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Sabtu: [],
    },
  },

  'MZ': {
    code: 'MZ',
    name: 'Masdalifah Zahara, S.Pd',
    page: 13,
    schedule: {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Seni Budaya (SBK)', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#ea580c' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Seni Budaya (SBK)', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Seni Budaya (SBK)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Seni Budaya (SBK)', kelas: 'X MPLB', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  'RA': {
    code: 'RA',
    name: 'Ricardo Agogo Sirait, ST',
    page: 14,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'Matematika (MM)', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Matematika (MM)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Matematika (MM)', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#ef4444' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Matematika (MM)', kelas: 'X AKL', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'IPAS', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'IPAS', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#ea580c' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', mapel: 'Matematika (MM)', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'IPAS', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#ea580c' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'IPAS', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '8', periods: [8], waktu: '13:00 - 13:40', mapel: 'Matematika (MM)', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'IPAS', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'IPAS', kelas: 'X TJKT', ruangan: 'R. Teori', color: '#ea580c' },
      ],
      Sabtu: [],
    },
  },

  'EW': {
    code: 'EW',
    name: 'Eliwati, S.Pd',
    page: 15,
    schedule: {
      Senin: [
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Selasa: [
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PKK', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDPM', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
      ],
      Rabu: [
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDPM', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
      ],
      Kamis: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'DDAKL', kelas: 'X AKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PKK', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '8 - 11', periods: [8, 9, 10, 11], waktu: '13:00 - 15:40', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Jumat: [],
      Sabtu: [],
    },
  },

  'GS': {
    code: 'GS',
    name: 'Gusniaty Tanjung, S.Pd',
    page: 16,
    schedule: {
      Senin: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'DDAKL', kelas: 'X AKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDAKL', kelas: 'X AKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'DDAKL', kelas: 'X AKL', ruangan: 'Lab Akuntansi', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Sabtu: [],
    },
  },

  'YN': {
    code: 'YN',
    name: 'Yenny, SE',
    page: 17,
    schedule: {
      Senin: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Informatika KKPI', kelas: 'X TJKT', ruangan: 'Lab KKPI 3', color: '#ea580c' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', kelas: 'XII TJKT', ruangan: 'Lab KKPI 3', color: '#ef4444' },
      ],
      Selasa: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KKPI', kelas: 'XI TJKT', ruangan: 'Lab KKPI 3', color: '#94a3b8' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KKPI', kelas: 'XII AKL', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Informatika KKPI', kelas: 'X AKL', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', kelas: 'XII MPLB, XII PM', ruangan: 'Lab TKJ 3', color: '#0d9488' },
      ],
      Kamis: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KKPI', kelas: 'XI PM', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'SA': {
    code: 'SA',
    name: 'Sri Astuti, S.Pd',
    page: 18,
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PKK', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Selasa: [],
      Rabu: [
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'DDAKL', kelas: 'X AKL', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab KKPI 3', color: '#bef264' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'DDPM', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'PKK', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', mapel: 'PKK', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab KKPI 3', color: '#bef264' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'PKK', kelas: 'XII PM', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'DDPM', kelas: 'X PM', ruangan: 'R. Teori', color: '#f97316' },
      ],
      Sabtu: [],
    },
  },

  'IR': {
    code: 'IR',
    name: 'M. Iqbal Rangkuti, S.Kom',
    page: 19,
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'MP-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'DDTJKT', kelas: 'X TJKT', ruangan: 'Lab TKJ 2', color: '#ea580c' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'DDTJKT', kelas: 'X TJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 1', color: '#ef4444' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'MP-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'DDTJKT', kelas: 'X TJKT', ruangan: 'Lab TKJ 1', color: '#ea580c' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 1', color: '#94a3b8' },
      ],
      Sabtu: [],
    },
  },

  'RP': {
    code: 'RP',
    name: 'Dra. Roslin Panjaitan',
    page: 20,
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'MP-PM', kelas: 'XII PM', ruangan: 'XII BM', color: '#2563eb' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Selasa: [],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    },
  },

  'ZB': {
    code: 'ZB',
    name: 'Dra. Zubaidah',
    page: 21,
    schedule: {
      Senin: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', mapel: 'PAI', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', mapel: 'PAI', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PAI', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PAI', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', mapel: 'PAI', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PAI', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#94a3b8' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'PAI', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'PAI', kelas: 'XI MPLB', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'PAI', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#ef4444' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'PAI', kelas: 'XI AKL', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '10', periods: [10], waktu: '14:20 - 15:00', mapel: 'PAI', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', mapel: 'PAI', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#ef4444' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'PAI', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'PAI', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#94a3b8' },
      ],
      Sabtu: [],
    },
  },

  'EV': {
    code: 'EV',
    name: 'Elvi Rahimah Dalimunhe, S.Pd',
    page: 22,
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KKPI', kelas: 'XI MPLB', ruangan: 'Lab KKPI 3', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', kelas: 'XI AKL', ruangan: 'Lab KKPI 3', color: '#bef264' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 6', periods: [1, 2, 3, 4, 5, 6], waktu: '07:15 - 11:35', mapel: 'Guru Piket', kelas: 'Semua Kelas', ruangan: 'Pos Piket', color: '#64748b' },
      ],
      Sabtu: [],
    },
  },

  'JU': {
    code: 'JU',
    name: 'Juraidah Hasibuan, S.Pd',
    page: 23,
    schedule: {
      Senin: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'MP-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PKK', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-MPLB', kelas: 'XII MPLB', ruangan: 'Lab MPLB', color: '#0d9488' },
      ],
      Rabu: [],
      Kamis: [],
      Jumat: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-MPLB', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'PKK', kelas: 'XI MPLB', ruangan: 'Lab MPLB', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  'RS': {
    code: 'RS',
    name: 'Rumaidin Sikumbang, S.Pd',
    page: 24,
    schedule: {
      Senin: [],
      Selasa: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'MP-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#ef4444' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#94a3b8' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'MP-PM', kelas: 'XI PM', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII MPLB, XII PM', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII PM', ruangan: 'XII BM', color: '#2563eb' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII MPLB', ruangan: 'XII BM', color: '#0d9488' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XI TJKT', ruangan: 'R. Teori', color: '#94a3b8' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII TJKT', ruangan: 'R. Teori', color: '#ef4444' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Bahasa Inggris (B-ING)', kelas: 'XII AKL', ruangan: 'R. Kelas', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  'HR': {
    code: 'HR',
    name: 'Hendrawan, ST',
    page: 25,
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'MP-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-PM', kelas: 'XI PM', ruangan: 'Lab TKJ 2', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-PM', kelas: 'XII PM', ruangan: 'Lab TKJ 2', color: '#2563eb' },
      ],
      Jumat: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-TJKT', kelas: 'XI TJKT', ruangan: 'Lab TKJ 2', color: '#94a3b8' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-TJKT', kelas: 'XII TJKT', ruangan: 'Lab TKJ 2', color: '#ef4444' },
      ],
      Sabtu: [],
    },
  },

  'JN': {
    code: 'JN',
    name: 'Junaidi, SE',
    page: 26,
    schedule: {
      Senin: [],
      Selasa: [],
      Rabu: [
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'MP-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Kamis: [
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'MP-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'MP-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-AKL', kelas: 'XI AKL', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Jumat: [
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-AKL', kelas: 'XII AKL', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  'PIKET': {
    code: 'PIKET',
    name: 'Guru Piket Harian',
    page: 27,
    schedule: {
      Senin: [{ jamKe: '1 - 11', periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], waktu: '07:15 - 15:40', mapel: 'Piket Hari Senin', guru: 'Fahrul Lubis, S.Pd', ruangan: 'Pos Piket', color: '#64748b' }],
      Selasa: [{ jamKe: '1 - 11', periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], waktu: '07:15 - 15:40', mapel: 'Piket Hari Selasa', guru: 'Guru Piket Terjadwal', ruangan: 'Pos Piket', color: '#64748b' }],
      Rabu: [{ jamKe: '1 - 11', periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], waktu: '07:15 - 15:40', mapel: 'Piket Hari Rabu', guru: 'Fahrul Lubis, S.Pd', ruangan: 'Pos Piket', color: '#64748b' }],
      Kamis: [{ jamKe: '1 - 11', periods: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], waktu: '07:15 - 15:40', mapel: 'Piket Hari Kamis', guru: 'Guru Piket Terjadwal', ruangan: 'Pos Piket', color: '#64748b' }],
      Jumat: [{ jamKe: '1 - 6', periods: [1, 2, 3, 4, 5, 6], waktu: '07:15 - 11:35', mapel: 'Piket Hari Jum\'at', guru: 'Elvi Rahimah Dalimunhe, S.Pd', ruangan: 'Pos Piket', color: '#64748b' }],
      Sabtu: [],
    },
  },
};

// 🗺️ PEMETAAN NAMA GURU DB/SISTEM KE KODE ASC TIMETABLE
export const TB_GURU_MAPPING = {
  'ARMAN EFFENDI': 'AP',
  'SOLAWATI NAINGGOLAN': 'SN',
  'AMINAH NASUTION': 'AN',
  'AZIZAH SIMANJUNTAK': 'AZ',
  'TRI HERDINA ATIKA': 'TH',
  'SOFIA INDRIANI': 'SI',
  'AHMAD FAUZI': 'AF',
  'NENENG GUSTANTI': 'NG',
  'FAHRUL LUBIS': 'FL',
  'JAFAR ISMAIL': 'JI',
  'ERLINAWATI TAMBUNAN': 'ET',
  'MAULI SIMAMORA': 'MS',
  'MASDALIFAH ZAHARA': 'MZ',
  'RICARDO AGOGO SIRAIT': 'RA',
  'ELIWATI': 'EW',
  'GUSNIATY TANJUNG': 'GS',
  'YENNY': 'YN',
  'SRI ASTUTI': 'SA',
  'M. IQBAL RANGKUTI': 'IR',
  'M IQBAL RANGKUTI': 'IR',
  'IQBAL RANGKUTI': 'IR',
  'ROSLIN PANJAITAN': 'RP',
  'ZUBAIDAH': 'ZB',
  'ELVI RAHIMAH DALIMUNHE': 'EV',
  'ELVI RAHIMAH': 'EV',
  'JURAIDAH HASIBUAN': 'JU',
  'RUMAIDIN SIKUMBANG': 'RS',
  'HENDRAWAN': 'HR',
  'JUNAIDI': 'JN',
  'PIKET': 'PIKET',
};

// Helper pencocokan data guru ke Roster Resmi
export function matchTeacherRoster(currentUser) {
  if (!currentUser) return null;

  const rawName = String(
    currentUser?.name ||
    currentUser?.nama ||
    currentUser?.username ||
    currentUser?.email ||
    ''
  ).toUpperCase().trim();

  // 1. Cek kode langsung jika ada (misal AP, AF, SN, IR)
  if (OFFICIAL_TEACHER_ROSTERS[rawName]) {
    return OFFICIAL_TEACHER_ROSTERS[rawName];
  }

  // 2. Cocokkan substring pada TB_GURU_MAPPING
  for (const [key, code] of Object.entries(TB_GURU_MAPPING)) {
    if (rawName.includes(key)) {
      return OFFICIAL_TEACHER_ROSTERS[code];
    }
  }

  // 3. Cocokkan jika inisial di dalam kurung siku ada di nama, misal [IR] atau [AF]
  for (const code of Object.keys(OFFICIAL_TEACHER_ROSTERS)) {
    if (rawName.includes(`[${code}]`) || rawName.endsWith(` ${code}`)) {
      return OFFICIAL_TEACHER_ROSTERS[code];
    }
  }

  // Fallback default
  return OFFICIAL_TEACHER_ROSTERS['IR'] || OFFICIAL_TEACHER_ROSTERS['AF'];
}

export default function TeacherRosterCard({ currentUser }) {
  const teacherRoster = useMemo(() => {
    return matchTeacherRoster(currentUser);
  }, [currentUser]);

  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = daysMap[new Date().getDay()] || 'Senin';
  const initialActiveDay = todayName === 'Minggu' || todayName === 'Sabtu' ? 'Senin' : todayName;

  const [selectedDay, setSelectedDay] = useState(initialActiveDay);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const daySchedule = teacherRoster?.schedule?.[selectedDay] || [];
  const weeklySchedule = teacherRoster?.schedule || {};

  return (
    <div
      className="stardust-white-card"
      style={{
        borderRadius: '16px',
        padding: '16px 18px',
        border: '1px solid #bfdbfe',
        boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* HEADER WIDGET JADWAL MENGAJAR GURU */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #dbeafe',
          paddingBottom: '12px',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
              flexShrink: 0,
            }}
          >
            📋
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Jadwal Mengajar: {teacherRoster?.name}
              </h3>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  letterSpacing: '0.4px',
                }}
              >
                [{teacherRoster?.code}]
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
              Roster Mengajar Guru Resmi • aSc Timetables T.P 2026/2027
            </p>
          </div>
        </div>

        {/* BUTTON BUKA LIGHTBOX MODAL MATRIKS LENGKAP */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            padding: '7px 12px',
            borderRadius: '10px',
            fontSize: '11.5px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dcfce7';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f0fdf4';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <span>🔍</span>
          <span>Buka Matriks Lengkap</span>
        </button>
      </div>

      {/* TAB PILIHAN HARI (SENIN - JUM'AT) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '6px',
          marginBottom: '12px',
        }}
      >
        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
          const isActive = selectedDay === day;
          const isCurrentToday = todayName === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                flex: '1 0 auto',
                padding: '8px 12px',
                borderRadius: '10px',
                border: isActive ? '1px solid #10b981' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#10b981' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: isActive ? '800' : '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 3px 8px rgba(16, 185, 129, 0.25)' : 'none',
              }}
            >
              <span>{day}</span>
              {isCurrentToday && (
                <span
                  style={{
                    fontSize: '8.5px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                    color: isActive ? '#ffffff' : '#15803d',
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

      {/* LIST KARTU JADWAL HARIAN */}
      <div>
        {daySchedule.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              color: '#64748b',
              fontSize: '12px',
              border: '1px dashed #cbd5e1',
            }}
          >
            ☕ Tidak ada jadwal tatap muka mengajar di hari <b>{selectedDay}</b>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {daySchedule.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${item.color || '#10b981'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  gap: '12px',
                }}
              >
                {/* JAM KE & WAKTU */}
                <div
                  style={{
                    minWidth: '95px',
                    borderRight: '1px solid #e2e8f0',
                    paddingRight: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: '800',
                      color: item.color || '#10b981',
                      letterSpacing: '0.2px',
                    }}
                  >
                    Les {item.jamKe}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b' }}>
                    {item.waktu || getPeriodTimeRange(item.periods)}
                  </span>
                </div>

                {/* MATA PELAJARAN & KELAS */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.mapel}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {item.kelas && (
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        🏫 {item.kelas}
                      </span>
                    )}
                    {item.ruangan && (
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          color: '#334155',
                          fontWeight: '600',
                        }}
                      >
                        📍 {item.ruangan}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL / POPUP MATRIKS aSc TIMETABLE */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '960px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #cbd5e1',
              padding: '20px 24px',
              position: 'relative',
            }}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '14px',
                marginBottom: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#10b981', backgroundColor: '#ecfdf5', padding: '2px 7px', borderRadius: '4px' }}>
                  SMK YPK MEDAN • AKREDITASI A
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
                  Matriks Mengajar: {teacherRoster?.name} [{teacherRoster?.code}]
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
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
                      <th style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 8px', minWidth: '70px', boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>Hari</th>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => (
                        <th key={p} style={{ border: '1px solid #cbd5e1', padding: '6px 4px', minWidth: '65px' }}>
                          <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a' }}>{p}</div>
                          <div style={{ fontSize: '8px', color: '#475569', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            {OFFICIAL_PERIOD_TIMES[p]?.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                      const slots = weeklySchedule[day] || [];
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
                                  backgroundColor: matchSlot.color || '#10b981',
                                  color: '#ffffff',
                                  padding: '5px 4px',
                                  fontWeight: 'bold',
                                  lineHeight: 1.2,
                                }}
                              >
                                <div style={{ fontSize: '11px', fontWeight: '900' }}>{matchSlot.mapel}</div>
                                <div style={{ fontSize: '8.5px', opacity: 0.95 }}>
                                  {matchSlot.kelas ? `${matchSlot.kelas} ` : ''}{matchSlot.ruangan ? `• ${matchSlot.ruangan}` : ''}
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
                <span>T.P 2026/2027</span>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '12px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Tutup Matriks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
