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
    id: 'f027d3d6-edc6-4e30-871a-c4630b0ff58b',
    name: 'fUNK mODERN',
    profile: 'jazz',
    entries: [
      { tuneId: 'chameleon', feel: 'funk', bpm: 96 },
      { tuneId: 'cantaloupe-island', feel: 'funk', bpm: 110 },
      { tuneId: 'beatrice', feel: 'balada', bpm: 130 },
      { tuneId: 'isnt-she-lovely', feel: 'funk', bpm: 120 },
      { tuneId: 'lucky-southern', feel: 'swing', bpm: 130 },
      { tuneId: 'affirmation', feel: 'funk', bpm: 110 },
      { tuneId: 'invitation', feel: 'latin', bpm: 140 },
      { tuneId: 'nica-s-dream', feel: 'latin', bpm: 130 },
      { tuneId: 'actual-proof', feel: 'funk', bpm: 120 },
    ],
    createdAt: '2026-07-28T21:52:49.897Z',
    updatedAt: '2026-07-28T22:05:01.073Z',
  },
  {
    id: '568bbe92-169a-46b0-ac39-4290fa86c756',
    name: 'Jazz CLASSICS',
    profile: 'jazz',
    entries: [
      { tuneId: 'lil-darlin', feel: 'balada', bpm: 68 },
      { tuneId: 'come-sunday', feel: 'balada', bpm: 58 },
      { tuneId: 'don-t-get-around-much-anymore', feel: 'swing', bpm: 126 },
      { tuneId: 'prelude-to-a-kiss', feel: 'balada', bpm: 60 },
      { tuneId: 'sophisticated-lady', feel: 'balada', bpm: 66 },
      { tuneId: 'take-the-a-train', feel: 'swing', bpm: 160 },
      { tuneId: 'all-blues', feel: 'blues', bpm: 140 },
      { tuneId: 'freddie-freeloader', feel: 'blues', bpm: 130 },
    ],
    createdAt: '2026-07-28T21:48:14.153Z',
    updatedAt: '2026-07-28T21:52:19.265Z',
  },
  {
    id: '2a756a15-6589-4ee4-a263-2840d4203308',
    name: 'Jazz Cool Jazz & Swing Standards',
    profile: 'jazz',
    entries: [
      { tuneId: 'just-one-of-those-things', feel: 'up', bpm: 190 },
      { tuneId: 'boplicity', feel: 'swing', bpm: 130 },
      { tuneId: 'ask-me-now', feel: 'balada', bpm: 62 },
      { tuneId: 'all-of-me', feel: 'swing', bpm: 128 },
      { tuneId: 'all-the-things-you-are', feel: 'swing', bpm: 150 },
      { tuneId: 'alone-together', feel: 'swing', bpm: 150 },
      { tuneId: 'blue-suede-shoes', feel: 'blues', bpm: 172 },
    ],
    createdAt: '2026-07-28T21:38:40.297Z',
    updatedAt: '2026-07-28T21:43:03.648Z',
  },
  {
    id: 'aec43cb0-cace-4045-897e-885678e5a405',
    name: 'Jazz Swing songbook',
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
    updatedAt: '2026-07-28T21:45:14.741Z',
  },
  {
    id: 'b7afe60e-fb84-46a1-add2-884bebfc73c8',
    name: 'Jazz  STANDARDS 1',
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
    updatedAt: '2026-07-28T22:00:41.716Z',
  },
  {
    id: '635398a2-2de6-4504-a54a-5af371eec675',
    name: 'Jazz  VARIADO',
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
    updatedAt: '2026-07-28T22:00:58.762Z',
  },
  {
    id: '59358627-19e9-46b2-b5a5-1b893eb1e7d2',
    name: 'Jazz Latin',
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
    updatedAt: '2026-07-28T21:34:09.586Z',
  },
];
