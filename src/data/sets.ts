import type { SetList } from '../types';

/**
 * Capa base de setlists — versionada, llega con cada deploy (igual que
 * `tunes.ts`). Cada dispositivo la fusiona con sus sets locales al hidratar
 * (ver `mergeBaseSets` en `store/setsStore.ts`): un set base se siembra una
 * vez por dispositivo; si se republica con un `updatedAt` más nuevo, se
 * propaga; nunca pisa un cambio local más reciente.
 *
 * Se rellena al aplicar un respaldo de la tablet: los `sets` del JSON se
 * copian aquí (ids UUID intactos). Un set que se quiera retirar de todos los
 * dispositivos se borra de esta lista (los que ya lo tengan local lo conservan
 * hasta borrarlo a mano).
 */
export const BASE_SETS: SetList[] = [
  {
    id: 'aec43cb0-cace-4045-897e-885678e5a405',
    name: 'Jazz 1',
    profile: 'jazz',
    entries: [
      { tuneId: 'moanin', feel: 'blues', bpm: 130 },
      { tuneId: 'youd-be-so-nice-to-come-home-to', feel: 'swing', bpm: 120 },
      { tuneId: 'i-can-t-give-you-anything-but-love', feel: 'swing', bpm: 132 },
      { tuneId: 'can-t-we-be-friends', feel: 'swing', bpm: 132 },
      { tuneId: 'almost-like-being-in-love', feel: 'up', bpm: 200 },
      { tuneId: 'just-you-just-me', feel: 'swing', bpm: 120 },
      { tuneId: 'things-ain-t-what-they-used-to-be', feel: 'blues', bpm: 108 },
      { tuneId: 'in-a-mellow-tone', feel: 'swing', bpm: 132 },
      { tuneId: 'nardis', feel: 'swing', bpm: 150 },
    ],
    createdAt: '2026-07-25T20:04:15.331Z',
    updatedAt: '2026-07-27T01:13:26.276Z',
  },
  {
    id: 'b7afe60e-fb84-46a1-add2-884bebfc73c8',
    name: 'Jazz  2',
    profile: 'jazz',
    entries: [
      { tuneId: 'moanin', feel: 'blues', bpm: 130 },
      { tuneId: 'it-could-happen-to-you', feel: 'swing', bpm: 130 },
      { tuneId: 'birks-works', feel: 'blues', bpm: 130 },
      { tuneId: 'a-night-in-tunisia', feel: 'latin', bpm: 180 },
      { tuneId: 'segment', feel: 'up', bpm: 200 },
      { tuneId: 'laura', feel: 'balada', bpm: 120 },
      { tuneId: 'my-little-suede-shoes', feel: 'latin', bpm: 160 },
    ],
    createdAt: '2026-07-26T00:13:43.844Z',
    updatedAt: '2026-07-27T02:36:18.435Z',
  },
  {
    id: '635398a2-2de6-4504-a54a-5af371eec675',
    name: 'Jazz  3',
    profile: 'jazz',
    entries: [
      { tuneId: 'girl-from-ipanema', feel: 'bossa', bpm: 130 },
      { tuneId: 'take-five', feel: 'latin', bpm: 170 },
      { tuneId: 'te-busco', feel: 'latin', bpm: 190 },
      { tuneId: 'all-or-nothing-at-all', feel: 'latin', bpm: 150 },
      { tuneId: 'besame-mucho', feel: 'latin', bpm: 104 },
      { tuneId: 'perfidia', feel: 'latin', bpm: 106 },
      { tuneId: 'boplicity', feel: 'swing', bpm: 130 },
      { tuneId: 'up-jumped-spring', feel: 'vals', bpm: 170 },
      { tuneId: 'wayne-s-thang', feel: 'latin', bpm: 120 },
      { tuneId: 'after-you-ve-gone', feel: 'up', bpm: 200 },
    ],
    createdAt: '2026-07-26T00:56:56.191Z',
    updatedAt: '2026-07-27T04:22:56.403Z',
  },
  {
    id: '59358627-19e9-46b2-b5a5-1b893eb1e7d2',
    name: 'Jazz 4',
    profile: 'jazz',
    entries: [
      { tuneId: 'st-thomas', feel: 'latin', bpm: 180 },
      { tuneId: 'chan-chan', feel: 'balada', bpm: 104 },
      { tuneId: 'oye-como-va', feel: 'latin', bpm: 120 },
      { tuneId: 'sway-quien-sera', feel: 'latin', bpm: 108 },
      { tuneId: 'hernando-s-hideaway', feel: 'latin', bpm: 124 },
      { tuneId: 'nica-s-dream', feel: 'latin', bpm: 130 },
    ],
    createdAt: '2026-07-28T05:53:12.107Z',
    updatedAt: '2026-07-28T06:26:12.048Z',
  },
];
