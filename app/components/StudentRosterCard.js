'use client';

import React, { useState, useMemo } from 'react';

// 🕒 DAFTAR JAM PELAJARAN RESMI SMK YPK MEDAN (SENIN - JUM'AT)
export const OFFICIAL_PERIOD_TIMES = {
  1: { time: '07:15 - 07:55', label: '07:15 - 07:55' },
  2: { time: '07:55 - 08:35', label: '07:55 - 08:35' },
  3: { time: '08:35 - 09:15', label: '08:35 - 09:15' },
  4: { time: '09:15 - 09:55', label: '09:15 - 09:55' },
  5: { time: '10:15 - 10:55', label: '10:15 - 10:55' },
  6: { time: '10:55 - 11:35', label: '10:55 - 11:35' },
  7: { time: '11:35 - 12:15', label: '11:35 - 12:15' },
  8: { time: '13:00 - 13:40', label: '13:00 - 13:40' },
  9: { time: '13:40 - 14:20', label: '13:40 - 14:20' },
  10: { time: '14:20 - 15:00', label: '14:20 - 15:00' },
  11: { time: '15:00 - 15:40', label: '15:00 - 15:40' },
};

// 📚 DATA MASTER ROSTER KELAS RESMI DARI ASC TIMETABLES (14 HALAMAN GAMBAR)
export const OFFICIAL_CLASS_ROSTERS = {
  'X MPLB': {
    page: 1,
    kelas: 'X MPLB',
    jurusan: 'MPLB',
    tingkat: 'X',
    waliKelas: 'Erlinawati Tambunan, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', guru: 'Solawati Nainggolan, S.Pd [SN]', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'DDMPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab TKJ 3', color: '#16a34a' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'IPAS', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', guru: 'Solawati Nainggolan, S.Pd [SN]', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Informatika Coding', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDMPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab MPLB', color: '#16a34a' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'DDMPLB', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'DDMPLB', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'IPAS', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Mengetik', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'Lab KKPI 3', color: '#f59e0b' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'IPAS', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'DDMPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Seni Budaya (SBK)', guru: 'Masdalifah Zahara, S.Pd [MZ]', ruangan: 'R. Teori', color: '#eab308' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'DDMPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Informatika KKPI', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'X PM': {
    page: 2,
    kelas: 'X PM',
    jurusan: 'PM',
    tingkat: 'X',
    waliKelas: 'Azizah Simanjuntak, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Informatika KKPI', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDPM', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab PM', color: '#16a34a' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'IPAS', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'DDPM', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab PM', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDPM', guru: 'Eliwati, S.Pd [EW]', ruangan: 'R. Teori', color: '#bef264' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Informatika Coding', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'IPAS', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDPM', guru: 'Eliwati, S.Pd [EW]', ruangan: 'R. Teori', color: '#bef264' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'DDPM', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'R. Teori', color: '#f97316' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Seni Budaya (SBK)', guru: 'Masdalifah Zahara, S.Pd [MZ]', ruangan: 'R. Teori', color: '#eab308' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Mengetik', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'Lab KKPI 3', color: '#f59e0b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'IPAS', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'DDPM', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'R. Teori', color: '#f97316' },
      ],
      Sabtu: [],
    },
  },

  'X AKL': {
    page: 3,
    kelas: 'X AKL',
    jurusan: 'AKL',
    tingkat: 'X',
    waliKelas: 'Gusniaty Tanjung, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'DDAKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'DDAKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Informatika KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'DDAKL', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'Lab KKPI 3', color: '#fef08a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'IPAS', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'IPAS', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'DDAKL', guru: 'Eliwati, S.Pd [EW]', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Mengetik', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'Lab KKPI 3', color: '#f59e0b' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Seni Budaya (SBK)', guru: 'Masdalifah Zahara, S.Pd [MZ]', ruangan: 'R. Teori', color: '#eab308' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Informatika Coding', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'DDAKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'IPAS', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
      ],
      Sabtu: [],
    },
  },

  'X TJKT': {
    page: 4,
    kelas: 'X TJKT',
    jurusan: 'TJKT',
    tingkat: 'X',
    waliKelas: 'M. Iqbal Rangkuti, S.Kom',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Informatika KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'DDTJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 2', color: '#d946ef' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'DDTJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'PAI', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Tri Herdina Atika, S.Pd [TH]', ruangan: 'R. Teori', color: '#991b1b' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'IPAS', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'IPAS', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'DDTJKT', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Seni Budaya (SBK)', guru: 'Masdalifah Zahara, S.Pd [MZ]', ruangan: 'R. Teori', color: '#eab308' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Informatika Coding', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'DDTJKT', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Mengetik', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'Lab KKPI 3', color: '#f59e0b' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'DDTJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'IPAS', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'XI AKL': {
    page: 5,
    kelas: 'XI AKL',
    jurusan: 'AKL',
    tingkat: 'XI',
    waliKelas: 'Junaidi, SE',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Bahasa Inggris (B-ING)', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', mapel: 'Matematika (MM)', guru: 'Solawati Nainggolan, S.Pd [SN]', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-AKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'KK-AKL', guru: 'Eliwati, S.Pd [EW]', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', mapel: 'KK-AKL', guru: 'Eliwati, S.Pd [EW]', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PKK', guru: 'Eliwati, S.Pd [EW]', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', guru: 'Elvi Rahimah Dalimunhe, S.Pd [EV]', ruangan: 'Lab KKPI 3', color: '#2563eb' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Inggris (B-ING)', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-AKL', guru: 'Junaidi, SE [JN]', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'MP-AKL', guru: 'Junaidi, SE [JN]', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-AKL', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'Lab KKPI 3', color: '#fef08a' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'MP-AKL', guru: 'Junaidi, SE [JN]', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PKK', guru: 'Eliwati, S.Pd [EW]', ruangan: 'R. Teori', color: '#bef264' },
        { jamKe: '8', periods: [8], waktu: '13:00 - 13:40', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-AKL', guru: 'Junaidi, SE [JN]', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-AKL', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'Lab KKPI 3', color: '#fef08a' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'KK-AKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Matematika (MM)', guru: 'Solawati Nainggolan, S.Pd [SN]', ruangan: 'R. Teori', color: '#22c55e' },
      ],
      Sabtu: [],
    },
  },

  'XI MPLB': {
    page: 6,
    kelas: 'XI MPLB',
    jurusan: 'MPLB',
    tingkat: 'XI',
    waliKelas: 'Juraidah Hasibuan, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-MPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Inggris (B-ING)', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '5', periods: [5], waktu: '10:15 - 10:55', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'Matematika (MM)', guru: 'Solawati Nainggolan, S.Pd [SN]', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PKK', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-MPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', mapel: 'Matematika (MM)', guru: 'Solawati Nainggolan, S.Pd [SN]', ruangan: 'R. Teori', color: '#22c55e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-MPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KKPI', guru: 'Elvi Rahimah Dalimunhe, S.Pd [EV]', ruangan: 'Lab KKPI 3', color: '#2563eb' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-MPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab TKJ 3', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-MPLB', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
      ],
      Kamis: [
        { jamKe: '2 - 5', periods: [2, 3, 4, 5], waktu: '07:55 - 10:55', mapel: 'MP-MPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab TKJ 3', color: '#16a34a' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-MPLB', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-MPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab MPLB', color: '#16a34a' },
      ],
      Jumat: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-MPLB', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'PKK', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
      ],
      Sabtu: [],
    },
  },

  'XI PM': {
    page: 7,
    kelas: 'XI PM',
    jurusan: 'PM',
    tingkat: 'XI',
    waliKelas: 'Dra. Roslin Panjaitan',
    schedule: {
      Senin: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '3', periods: [3], waktu: '08:35 - 09:15', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PKK', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-PM', guru: 'Yenny, SE [YN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Inggris (B-ING)', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Teori', color: '#6366f1' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'KK-PM', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'R. Teori', color: '#2563eb' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'MP-PM', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-PM', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'R. Teori', color: '#f59e0b' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-PM', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'MP-PM', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Teori', color: '#6366f1' },
        { jamKe: '8', periods: [8], waktu: '13:00 - 13:40', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-PM', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'R. Teori', color: '#f59e0b' },
      ],
      Kamis: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-PM', guru: 'Yenny, SE [YN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'PKK', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-PM', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab TKJ 3', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'XI TJKT': {
    page: 9,
    kelas: 'XI TJKT',
    jurusan: 'TJKT',
    tingkat: 'XI',
    waliKelas: 'Hendrawan, ST',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-TJKT', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'MP-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 2', color: '#d946ef' },
        { jamKe: '9', periods: [9], waktu: '13:40 - 14:20', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Selasa: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-TJKT', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 2', color: '#d946ef' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'PKK', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Teori', color: '#fef08a' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'PKK', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'MP-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Sejarah', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'PJOK / Penjas', guru: 'Fahrul Lubis, S.Pd [FL]', ruangan: 'Lapangan', color: '#64748b' },
      ],
      Jumat: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-TJKT', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
        { jamKe: '6', periods: [6], waktu: '10:55 - 11:35', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
      ],
      Sabtu: [],
    },
  },

  'XII AKL': {
    page: 10,
    kelas: 'XII AKL',
    jurusan: 'AKL',
    tingkat: 'XII',
    waliKelas: 'Sri Astuti, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'KK-AKL', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'Lab KKPI 3', color: '#fef08a' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-AKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
      ],
      Selasa: [
        { jamKe: '1 - 6', periods: [1, 2, 3, 4, 5, 6], waktu: '07:15 - 11:35', mapel: 'KK-AKL', guru: 'Gusniaty Tanjung, S.Pd [GS]', ruangan: 'Lab Akuntansi', color: '#22c55e' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'PKK', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '10', periods: [10], waktu: '14:20 - 15:00', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
      ],
      Rabu: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'KK-AKL', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'Lab KKPI 3', color: '#fef08a' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-AKL', guru: 'Eliwati, S.Pd [EW]', ruangan: 'Lab Akuntansi', color: '#bef264' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'PKK', guru: 'Aminah Nasution, SE [AN]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'MP-AKL', guru: 'Junaidi, SE [JN]', ruangan: 'Lab Akuntansi', color: '#84cc16' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-AKL', guru: 'Eliwati, S.Pd [EW]', ruangan: 'Lab Akuntansi', color: '#bef264' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
        { jamKe: '3 - 6', periods: [3, 4, 5, 6], waktu: '08:35 - 11:35', mapel: 'KK-AKL', guru: 'Junaidi, SE [JN]', ruangan: 'Lab Akuntansi', color: '#84cc16' },
      ],
      Sabtu: [],
    },
  },

  'XII MPLB': {
    page: 11,
    kelas: 'XII MPLB',
    jurusan: 'MPLB',
    tingkat: 'XII',
    waliKelas: 'Mauli Simamora, S.Pd',
    schedule: {
      Senin: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Kelas XII BM', color: '#06b6d4' },
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'MP-MPLB', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'KK-MPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-MPLB', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Kelas XII BM', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Kelas XII BM', color: '#06b6d4' },
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', mapel: 'PKK', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'KK-MPLB', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-MPLB', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KK-MPLB', guru: 'Juraidah Hasibuan, S.Pd [JU]', ruangan: 'Lab MPLB', color: '#3b82f6' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-MPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab MPLB', color: '#16a34a' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-MPLB', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab MPLB', color: '#16a34a' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Kelas XII BM', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'PKK', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-MPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Kelas XII BM', color: '#16a34a' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', mapel: 'KK-MPLB', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'Lab MPLB', color: '#2563eb' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Kelas XII BM', color: '#fef08a' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Kelas XII BM', color: '#fef08a' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'KK-MPLB', guru: 'Mauli Simamora, S.Pd [MS]', ruangan: 'Lab MPLB', color: '#dc2626' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Kelas XII BM', color: '#4ade80' },
      ],
      Sabtu: [],
    },
  },

  'XII PM': {
    page: 12,
    kelas: 'XII PM',
    jurusan: 'PM',
    tingkat: 'XII',
    waliKelas: 'Drs. Jafar Ismail',
    schedule: {
      Senin: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Kelas XII BM', color: '#06b6d4' },
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-PM', guru: 'Yenny, SE [YN]', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '5 - 7', periods: [5, 6, 7], waktu: '10:15 - 12:15', mapel: 'MP-PM', guru: 'Dra. Roslin Panjaitan [RP]', ruangan: 'R. Kelas XII BM', color: '#6366f1' },
        { jamKe: '8 - 9', periods: [8, 9], waktu: '13:00 - 14:20', mapel: 'KK-PM', guru: 'Azizah Simanjuntak, S.Pd [AZ]', ruangan: 'Lab TKJ 3', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Kelas XII BM', color: '#84cc16' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Kelas XII BM', color: '#06b6d4' },
        { jamKe: '3 - 5', periods: [3, 4, 5], waktu: '08:35 - 10:55', mapel: 'KK-PM', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'R. Kelas', color: '#f59e0b' },
        { jamKe: '6 - 8', periods: [6, 7, 8], waktu: '10:55 - 13:40', mapel: 'KK-PM', guru: 'Yenny, SE [YN]', ruangan: 'R. Kelas', color: '#06b6d4' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-PM', guru: 'Yenny, SE [YN]', ruangan: 'R. Kelas', color: '#06b6d4' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-PM', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'R. Kelas', color: '#f59e0b' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-PM', guru: 'Erlinawati Tambunan, S.Pd [ET]', ruangan: 'R. Kelas', color: '#f59e0b' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Kelas XII BM', color: '#16a34a' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'KK-PM', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '4 - 5', periods: [4, 5], waktu: '09:15 - 10:55', mapel: 'KK-PM', guru: 'Drs. Jafar Ismail [JI]', ruangan: 'R. Kelas', color: '#2563eb' },
        { jamKe: '6 - 7', periods: [6, 7], waktu: '10:55 - 12:15', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Kelas XII BM', color: '#16a34a' },
        { jamKe: '8 - 10', periods: [8, 9, 10], waktu: '13:00 - 15:00', mapel: 'PKK', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'R. Kelas', color: '#fef08a' },
        { jamKe: '11', periods: [11], waktu: '15:00 - 15:40', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Kelas XII BM', color: '#fef08a' },
      ],
      Jumat: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', guru: 'Ir. Sofia Indriani Lbs, MPd [SI]', ruangan: 'R. Kelas XII BM', color: '#fef08a' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'PKK', guru: 'Sri Astuti, S.Pd [SA]', ruangan: 'R. Kelas', color: '#fef08a' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Kelas XII BM', color: '#4ade80' },
      ],
      Sabtu: [],
    },
  },

  'XII TJKT': {
    page: 13,
    kelas: 'XII TJKT',
    jurusan: 'TJKT',
    tingkat: 'XII',
    waliKelas: 'Ricardo Agogo Sirait, ST, MSi',
    schedule: {
      Senin: [
        { jamKe: '1 - 3', periods: [1, 2, 3], waktu: '07:15 - 09:15', mapel: 'MP-TJKT', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '4', periods: [4], waktu: '09:15 - 09:55', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-TJKT', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '7 - 9', periods: [7, 8, 9], waktu: '11:35 - 14:20', mapel: 'KK-TJKT', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 1', color: '#06b6d4' },
        { jamKe: '10 - 11', periods: [10, 11], waktu: '14:20 - 15:40', mapel: 'KKPI', guru: 'Yenny, SE [YN]', ruangan: 'Lab KKPI 3', color: '#06b6d4' },
      ],
      Selasa: [
        { jamKe: '1 - 2', periods: [1, 2], waktu: '07:15 - 08:35', mapel: 'Matematika (MM)', guru: 'Ricardo Agogo Sirait, ST [RA]', ruangan: 'R. Teori', color: '#0f766e' },
        { jamKe: '3 - 4', periods: [3, 4], waktu: '08:35 - 09:55', mapel: 'Bahasa Indonesia (B-IND)', guru: 'Neneng Gustanti, S.Pd [NG]', ruangan: 'R. Teori', color: '#4ade80' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 2', color: '#d946ef' },
      ],
      Rabu: [
        { jamKe: '2 - 4', periods: [2, 3, 4], waktu: '07:55 - 09:55', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 1', color: '#d946ef' },
        { jamKe: '5 - 6', periods: [5, 6], waktu: '10:15 - 11:35', mapel: 'KK-TJKT', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
        { jamKe: '7 - 8', periods: [7, 8], waktu: '11:35 - 13:40', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 2', color: '#d946ef' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'PKK', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 2', color: '#06b6d4' },
      ],
      Kamis: [
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'Pendidikan Pancasila', guru: 'Arman Effendi, S.Ag [AP]', ruangan: 'R. Teori', color: '#84cc16' },
        { jamKe: '4 - 8', periods: [4, 5, 6, 7, 8], waktu: '09:15 - 13:40', mapel: 'KK-TJKT', guru: 'M. Iqbal Rangkuti, S.Kom [IR]', ruangan: 'Lab TKJ 2', color: '#d946ef' },
        { jamKe: '9 - 11', periods: [9, 10, 11], waktu: '13:40 - 15:40', mapel: 'Bahasa Inggris (B-ING)', guru: 'Rumaidin Sikumbang, S.Pd [RS]', ruangan: 'R. Teori', color: '#16a34a' },
      ],
      Jumat: [
        { jamKe: '1', periods: [1], waktu: '07:15 - 07:55', mapel: 'PAI', guru: 'Dra. Zubaidah [ZB]', ruangan: 'R. Teori', color: '#06b6d4' },
        { jamKe: '2 - 3', periods: [2, 3], waktu: '07:55 - 09:15', mapel: 'PKK', guru: 'Ahmad Fauzi, S.Kom [AF]', ruangan: 'Lab TKJ 3', color: '#06b6d4' },
        { jamKe: '4 - 6', periods: [4, 5, 6], waktu: '09:15 - 11:35', mapel: 'KK-TJKT', guru: 'Hendrawan, ST [HR]', ruangan: 'Lab TKJ 2', color: '#f43f5e' },
      ],
      Sabtu: [],
    },
  },
};

// Helper pencocokan kelas siswa resmi SMK YPK MEDAN
export function matchStudentClassRoster(currentUser, siswaList = []) {
  if (!currentUser) return null;

  const rawKelas = String(currentUser?.kelas || '').toUpperCase().trim();
  const rawJurusan = String(currentUser?.jurusan || '').toUpperCase().trim();

  // 1. Cek kecocokan persis pada key daftar roster (misal 'XI TJKT', 'X TJKT', 'XII MPLB')
  if (OFFICIAL_CLASS_ROSTERS[rawKelas]) {
    return OFFICIAL_CLASS_ROSTERS[rawKelas];
  }

  // 2. Deteksi Tingkat Kelas secara spesifik (XII -> XI -> X)
  let level = '';
  if (rawKelas.includes('XII') || rawKelas.startsWith('12') || rawKelas.startsWith('XII')) {
    level = 'XII';
  } else if (rawKelas.includes('XI') || rawKelas.startsWith('11') || rawKelas.startsWith('XI')) {
    level = 'XI';
  } else if (rawKelas.includes('X') || rawKelas.startsWith('10') || rawKelas.startsWith('X')) {
    level = 'X';
  }

  // 3. Deteksi Jurusan (TJKT, MPLB, AKL, PM)
  let major = '';
  const combined = `${rawKelas} ${rawJurusan}`;
  if (combined.includes('TJKT') || combined.includes('TKJ')) {
    major = 'TJKT';
  } else if (combined.includes('MPLB') || combined.includes('OTKP') || combined.includes('AP')) {
    major = 'MPLB';
  } else if (combined.includes('AKL') || combined.includes('AK')) {
    major = 'AKL';
  } else if (combined.includes('PM') || combined.includes('BDP') || combined.includes('PJ')) {
    major = 'PM';
  }

  if (level && major) {
    const targetKey = `${level} ${major}`;
    if (OFFICIAL_CLASS_ROSTERS[targetKey]) {
      return OFFICIAL_CLASS_ROSTERS[targetKey];
    }
  }

  // 4. Cek apakah ada key roster yang terkandung dalam rawKelas
  // Urutkan key dari yang terpanjang ke terpendek agar 'XI TJKT' dicocokkan sebelum 'X TJKT'
  const sortedKeys = Object.keys(OFFICIAL_CLASS_ROSTERS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (rawKelas.includes(key)) {
      return OFFICIAL_CLASS_ROSTERS[key];
    }
  }

  // Default fallback
  return OFFICIAL_CLASS_ROSTERS['XI TJKT'] || OFFICIAL_CLASS_ROSTERS['X TJKT'];
}

export default function StudentRosterCard({ currentUser, siswaList = [] }) {
  const classRoster = useMemo(() => {
    return matchStudentClassRoster(currentUser, siswaList);
  }, [currentUser, siswaList]);

  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = daysMap[new Date().getDay()] || 'Senin';
  const initialActiveDay = todayName === 'Minggu' || todayName === 'Sabtu' ? 'Senin' : todayName;

  const [selectedDay, setSelectedDay] = useState(initialActiveDay);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const daySchedule = classRoster?.schedule?.[selectedDay] || [];
  const weeklySchedule = classRoster?.schedule || {};

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
      {/* HEADER WIDGET JADWAL KELAS SISWA */}
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
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
              flexShrink: 0,
            }}
          >
            📅
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Jadwal Belajar Kelas {classRoster?.kelas}
              </h3>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  letterSpacing: '0.4px',
                }}
              >
                T.P 2026/2027
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
              Roster Pelajaran Mingguan Resmi
            </p>
          </div>
        </div>

        {/* TOMBOL LIHAT MATRIKS ROSTER KELAS */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
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
          <span>Matriks Belajar Mingguan</span>
        </button>
      </div>

      {/* TAB PILIHAN HARI (SENIN - JUMAT) */}
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
        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
          const isSelected = selectedDay === day;
          const isToday = todayName === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                backgroundColor: isSelected ? '#2563eb' : '#f8fafc',
                color: isSelected ? '#ffffff' : '#475569',
                border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: isSelected ? 'bold' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{day}</span>
              {isToday && (
                <span
                  style={{
                    fontSize: '8.5px',
                    backgroundColor: isSelected ? '#ffffff' : '#22c55e',
                    color: isSelected ? '#2563eb' : '#ffffff',
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

      {/* DAFTAR JADWAL HARI TERPILIH */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {daySchedule.length === 0 ? (
          <div
            style={{
              padding: '14px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              color: '#64748b',
              fontSize: '12px',
            }}
          >
            ☕ Tidak ada jadwal pelajaran pada hari <b>{selectedDay}</b>.
          </div>
        ) : (
          daySchedule.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '3px 7px',
                    fontSize: '10.5px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    minWidth: '50px',
                  }}
                >
                  Jam {item.jamKe}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: 'bold', color: '#0f172a' }}>
                      {item.mapel}
                    </h4>
                    <span style={{ fontSize: '9.5px', color: '#1e40af', fontWeight: 'bold', backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                      {item.ruangan}
                    </span>
                  </div>
                  <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Guru: <b>{item.guru}</b>
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '5px' }}>
                  🕒 {item.waktu}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 📑 MODAL LIGHTBOX MATRIKS ROSTER DIGITAL KELAS SISWA */}
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
              maxWidth: '920px',
              width: '100%',
              maxHeight: '92vh',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 7px', borderRadius: '4px' }}>
                  SMK YPK MEDAN • AKREDITASI A
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
                  Matriks Jadwal Belajar: Kelas {classRoster?.kelas}
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
                                  backgroundColor: matchSlot.color || '#2563eb',
                                  color: '#ffffff',
                                  padding: '5px 4px',
                                  fontWeight: 'bold',
                                  lineHeight: 1.2,
                                }}
                              >
                                <div style={{ fontSize: '11px', fontWeight: '900' }}>{matchSlot.mapel}</div>
                                <div style={{ fontSize: '8.5px', opacity: 0.95 }}>
                                  {matchSlot.guru} {matchSlot.ruangan ? `• ${matchSlot.ruangan}` : ''}
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
                borderTop: '1px solid #f1f5f9',
                paddingTop: '14px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  backgroundColor: '#2563eb',
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
