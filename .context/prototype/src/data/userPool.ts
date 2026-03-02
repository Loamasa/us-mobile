
import { User, UserStatus } from '../types';
import { MOCK_FRIENDS, CURRENT_USER, MOCK_STRANGERS } from './users';

// --- PERSONA GENERATORS ---

const RAVER_NAMES = ['BassHead', 'NeonGhost', 'KlubbKid', 'VibeCheck', 'SubLow', 'Rhythm_X', 'DarkRoom', 'StrobeLight', 'BeatMkr', 'SynthWave', 'TechnoViking', 'AcidDrop', 'DeepHouse', 'TranceState', 'AfterHours'];
const TECHIE_NAMES = ['CodeWiz', 'PixelArt', 'GitPush', 'NullPtr', 'BinarySolo', 'DevOps', 'RustAce', 'AlgoRhythm', 'CyberPunk', 'NetRunner', 'HackThePlanet', 'StackOverflow', 'LinuxLover', 'VimUser', 'CloudNative'];
const EXPLORER_NAMES = ['UrbanWalker', 'RoofTopper', 'CitySnapper', 'StreetView', 'HiddenGem', 'LostFound', 'MapMaker', 'PathFinder', 'ConcreteJungle', 'NightWalk', 'BridgeTroll', 'CanalRat', 'ParkLife', 'SkyHigh', 'GroundLevel'];
const LOCAL_NAMES = ['MalmoBo', 'SkaneGuy', 'Svensson', 'FikaTime', 'LillaTorg', 'MollanFan', 'Triangeln', 'Varnhem', 'Ribersborg', 'TurningTorso', 'Oresund', 'Hyllie', 'Limhamn', 'Husie', 'Kirseberg'];
const GARDENER_NAMES = ['PlantMom', 'GreenThumb', 'Rooted', 'Leafy', 'Photosynthesis', 'Botanist', 'Sprout', 'Bloom', 'Harvest', 'CompostKing', 'Flora', 'Fauna', 'SoilSoul', 'WaterCan', 'SunSeeker'];

const generateUsers = (count: number, category: 'RAVER' | 'TECHIE' | 'EXPLORER' | 'LOCAL' | 'GARDENER'): User[] => {
    const users: User[] = [];
    let names: string[] = [];
    
    if (category === 'RAVER') names = RAVER_NAMES;
    else if (category === 'TECHIE') names = TECHIE_NAMES;
    else if (category === 'EXPLORER') names = EXPLORER_NAMES;
    else if (category === 'LOCAL') names = LOCAL_NAMES;
    else if (category === 'GARDENER') names = GARDENER_NAMES;

    const seedPrefix = category.toLowerCase();

    for (let i = 0; i < count; i++) {
        const nameIndex = i % names.length;
        const nameBase = names[nameIndex];
        const id = `u_${seedPrefix}_${i}`;
        
        // Consistent random status
        const statuses = [UserStatus.ONLINE, UserStatus.OFFLINE, UserStatus.AWAY, UserStatus.ONLINE];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Distinct avatar styles per category
        let avatarStyle = 'avataaars';
        if (category === 'RAVER') avatarStyle = 'micah'; // Artsy
        if (category === 'TECHIE') avatarStyle = 'bottts'; // Robots
        if (category === 'EXPLORER') avatarStyle = 'personas'; // Illustrated
        if (category === 'LOCAL') avatarStyle = 'initials'; // Simple
        if (category === 'GARDENER') avatarStyle = 'lorelei'; // Whimsical/Nature

        users.push({
            id,
            displayName: `${nameBase}_${i + 1}`,
            handle: `@${nameBase.toLowerCase()}${i}`,
            avatarUrl: `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${id}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            bio: `${category} enthusiast living in Malmö.`,
            status
        });
    }
    return users;
};

// --- GENERATE POOL ---

const ravers = generateUsers(15, 'RAVER');
const techies = generateUsers(10, 'TECHIE');
const explorers = generateUsers(10, 'EXPLORER');
const locals = generateUsers(15, 'LOCAL');
const gardeners = generateUsers(15, 'GARDENER');

// Combine everything into one master database
export const USER_POOL: User[] = [
    CURRENT_USER,
    ...MOCK_FRIENDS,
    ...MOCK_STRANGERS, 
    ...ravers,
    ...techies,
    ...explorers,
    ...locals,
    ...gardeners
];

// Helper to get users by persona/category for assigning to communities
export const GET_USERS_BY_TYPE = (type: 'RAVER' | 'TECHIE' | 'EXPLORER' | 'LOCAL' | 'GARDENER') => {
    if (type === 'RAVER') return ravers;
    if (type === 'TECHIE') return techies;
    if (type === 'EXPLORER') return explorers;
    if (type === 'GARDENER') return gardeners;
    return locals;
};
