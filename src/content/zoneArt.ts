import type { ZoneId } from './tasks'
import kitchen from '../assets/zones/kitchen.svg'
import hall from '../assets/zones/hall.svg'
import living from '../assets/zones/living.svg'
import bedroom from '../assets/zones/bedroom.svg'
import desk from '../assets/zones/desk.svg'
import bath from '../assets/zones/bath.svg'
import extra from '../assets/zones/extra.svg'

/** Иллюстрации мест из фирменного стиля: предмет на подложке цвета зоны. */
export const ZONE_ART: Record<ZoneId, string> = { kitchen, hall, living, bedroom, desk, bath, extra }
