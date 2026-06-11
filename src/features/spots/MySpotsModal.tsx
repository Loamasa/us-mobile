import { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GeoPoint } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import {
    onUserSpots,
    createUserSpot,
    updateUserSpot,
    deleteUserSpot,
    toggleUserSpot,
} from '@/lib/firestore';
import {
    COLORS,
    MAP_DEFAULTS,
    SPOT_ICONS,
    DEFAULT_SPOT_RADIUS,
} from '@/config/constants';
import { DARK_MAP_STYLE } from '@/config/mapStyles';
import { useEffect } from 'react';
import {
    formatSchedule,
    isWithinSchedule,
    normalizeTime,
} from '@/features/spots/spotSchedule';
import RadiusChips from '@/features/spots/RadiusChips';
import ScheduleFields from '@/features/spots/ScheduleFields';
import type { UserSpot } from '@/types';

// ─── Icons ───────────────────────────────────────────────────────────────────

const PlusIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
    <Text style={{ color, fontSize: size, lineHeight: size + 4, fontWeight: '300' }}>+</Text>
);

const EyeIcon = ({ size = 16, color = '#9CA3AF' }: { size?: number; color?: string }) => (
    <Text style={{ color, fontSize: size - 2, lineHeight: size + 2 }}>👁</Text>
);

const EyeOffIcon = ({ size = 16, color = '#9CA3AF' }: { size?: number; color?: string }) => (
    <Text style={{ color, fontSize: size - 2, lineHeight: size + 2, opacity: 0.4 }}>👁</Text>
);

const MapPinIcon = ({ size = 32, color = '#374151' }: { size?: number; color?: string }) => (
    <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>📍</Text>
);

const EditIcon = ({ size = 14, color = '#6B7280' }: { size?: number; color?: string }) => (
    <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>✏️</Text>
);

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = 'LIST' | 'CREATE' | 'EDIT';

interface SpotForm {
    name: string;
    emoji: string;
    radius: number;
    lat: number;
    lng: number;
    // Active-hours window. `scheduled` off = active around the clock.
    scheduled: boolean;
    days: number[]; // ISO weekdays, 1 = Mon … 7 = Sun
    start: string;
    end: string;
}

const DEFAULT_FORM: SpotForm = {
    name: '',
    emoji: '🏠',
    radius: DEFAULT_SPOT_RADIUS,
    lat: MAP_DEFAULTS.initialRegion.latitude,
    lng: MAP_DEFAULTS.initialRegion.longitude,
    scheduled: false,
    days: [1, 2, 3, 4, 5],
    start: '08:00',
    end: '17:00',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface MySpotsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MySpotsModal({ visible, onClose }: MySpotsModalProps) {
    const [spots, setSpots] = useState<UserSpot[]>([]);
    const [mode, setMode] = useState<Mode>('LIST');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<SpotForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const mapRef = useRef<any>(null);

    const userId = auth.currentUser?.uid;

    // Real-time spots listener
    useEffect(() => {
        if (!visible || !userId) return;
        const unsub = onUserSpots(userId, setSpots);
        return unsub;
    }, [visible, userId]);

    // Reset to LIST when modal opens
    useEffect(() => {
        if (visible) {
            setMode('LIST');
            setEditingId(null);
            setForm(DEFAULT_FORM);
        }
    }, [visible]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleStartCreate = () => {
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setMode('CREATE');
    };

    const handleStartEdit = (spot: UserSpot) => {
        setEditingId(spot.id);
        setForm({
            name: spot.name,
            emoji: spot.emoji,
            radius: spot.radius,
            lat: spot.location.latitude,
            lng: spot.location.longitude,
            scheduled: !!spot.schedule,
            days: spot.schedule?.days ?? DEFAULT_FORM.days,
            start: spot.schedule?.start ?? DEFAULT_FORM.start,
            end: spot.schedule?.end ?? DEFAULT_FORM.end,
        });
        setMode('EDIT');
    };

    const handleBack = () => {
        setMode('LIST');
        setEditingId(null);
        setForm(DEFAULT_FORM);
    };

    const handleSave = async () => {
        if (!userId || !form.name.trim()) return;

        let schedule: UserSpot['schedule'] = null;
        if (form.scheduled) {
            const start = normalizeTime(form.start);
            const end = normalizeTime(form.end);
            if (!start || !end) {
                Alert.alert('Invalid time', 'Use 24h times like 08:00 or 17:30.');
                return;
            }
            if (form.days.length === 0) {
                Alert.alert('No days selected', 'Pick at least one weekday for the schedule.');
                return;
            }
            schedule = { days: [...form.days].sort((a, b) => a - b), start, end };
        }

        setSaving(true);
        try {
            const spotData = {
                name: form.name.trim(),
                emoji: form.emoji,
                radius: form.radius,
                location: new GeoPoint(form.lat, form.lng),
                isActive: true,
                schedule,
            };
            if (mode === 'EDIT' && editingId) {
                await updateUserSpot(userId, editingId, spotData);
            } else {
                await createUserSpot(userId, spotData);
            }
            handleBack();
        } catch (err) {
            console.error('Save spot failed:', err);
            Alert.alert('Error', 'Could not save spot. Is the emulator running?');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!userId || !editingId) return;
        Alert.alert('Delete Place', 'Remove this spot?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteUserSpot(userId, editingId);
                        handleBack();
                    } catch (err) {
                        console.error('Delete spot failed:', err);
                    }
                },
            },
        ]);
    };

    const handleToggle = async (spot: UserSpot) => {
        if (!userId) return;
        try {
            await toggleUserSpot(userId, spot.id, !spot.isActive);
        } catch (err) {
            console.error('Toggle spot failed:', err);
        }
    };

    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setForm((f) => ({ ...f, lat: latitude, lng: longitude }));
    };

    const handleMarkerDrag = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setForm((f) => ({ ...f, lat: latitude, lng: longitude }));
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const renderMap = () => {
        if (mode === 'LIST') return null;

        // react-native-maps is stubbed to an empty module on web (metro.config.js)
        if (Platform.OS === 'web') {
            return (
                <View
                    style={{
                        flex: 1,
                        borderRadius: 16,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                    }}
                >
                    <Text style={{ color: 'rgba(242,244,246,0.5)', fontSize: 12 }}>
                        Map editing isn't available on web — pin stays at{' '}
                        {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                    </Text>
                </View>
            );
        }

        try {
            const MapView = require('react-native-maps').default;
            const { Marker, Circle } = require('react-native-maps');

            return (
                <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        customMapStyle={DARK_MAP_STYLE}
                        region={{
                            latitude: form.lat,
                            longitude: form.lng,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        onPress={handleMapPress}
                        showsUserLocation
                        showsMyLocationButton={false}
                        showsCompass={false}
                    >
                        <Circle
                            center={{ latitude: form.lat, longitude: form.lng }}
                            radius={form.radius}
                            fillColor="rgba(46, 92, 255, 0.12)"
                            strokeColor="rgba(46, 92, 255, 0.4)"
                            strokeWidth={1.5}
                        />
                        <Marker
                            coordinate={{ latitude: form.lat, longitude: form.lng }}
                            draggable
                            onDragEnd={handleMarkerDrag}
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View
                                style={{
                                    backgroundColor: 'rgba(15,17,21,0.85)',
                                    borderWidth: 1.5,
                                    borderColor: COLORS.signal,
                                    borderRadius: 12,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>{form.emoji}</Text>
                                {form.name ? (
                                    <Text style={{ color: COLORS.fog, fontSize: 10, marginTop: 2 }}>
                                        {form.name}
                                    </Text>
                                ) : null}
                            </View>
                        </Marker>
                    </MapView>

                    {/* Mode hint overlay */}
                    <View
                        style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            zIndex: 10,
                            pointerEvents: 'none',
                        }}
                    >
                        <BlurView
                            tint="dark"
                            intensity={40}
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                borderRadius: 99,
                                paddingHorizontal: 12,
                                paddingVertical: 5,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.08)',
                                overflow: 'hidden',
                            }}
                        >
                            <Text
                                style={{
                                    color: COLORS.signal,
                                    fontSize: 10,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.2,
                                }}
                            >
                                🔵 Placement Mode
                            </Text>
                        </BlurView>
                    </View>
                </View>
            );
        } catch {
            return (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 16,
                    }}
                >
                    <Text style={{ color: COLORS.fog, opacity: 0.4, fontSize: 13 }}>
                        Map unavailable
                    </Text>
                </View>
            );
        }
    };

    // ── LIST view ─────────────────────────────────────────────────────────────

    const renderList = () => (
        <View style={{ flex: 1 }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingTop: 56,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                }}
            >
                <View>
                    <Text
                        style={{
                            color: 'rgba(242,244,246,0.4)',
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            marginBottom: 2,
                        }}
                    >
                        Settings
                    </Text>
                    <Text style={{ color: COLORS.fog, fontSize: 22, fontWeight: '800' }}>
                        My Places
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        onPress={handleStartCreate}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: COLORS.signal,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: COLORS.signal,
                            shadowOpacity: 0.4,
                            shadowRadius: 8,
                            elevation: 4,
                        }}
                        activeOpacity={0.8}
                    >
                        <PlusIcon size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ color: COLORS.fog, fontSize: 18, opacity: 0.6 }}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
                {/* Spot count */}
                <Text
                    style={{
                        color: 'rgba(242,244,246,0.4)',
                        fontSize: 10,
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        marginBottom: 4,
                    }}
                >
                    {spots.length} Saved Places
                </Text>

                {/* Empty state */}
                {spots.length === 0 && (
                    <View
                        style={{
                            alignItems: 'center',
                            paddingVertical: 48,
                            borderWidth: 1.5,
                            borderStyle: 'dashed',
                            borderColor: 'rgba(255,255,255,0.07)',
                            borderRadius: 20,
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            marginTop: 8,
                        }}
                    >
                        <MapPinIcon size={32} color="#374151" />
                        <Text
                            style={{
                                color: 'rgba(242,244,246,0.4)',
                                fontSize: 14,
                                fontWeight: '500',
                                marginTop: 10,
                            }}
                        >
                            No places defined yet.
                        </Text>
                        <Text
                            style={{
                                color: 'rgba(242,244,246,0.25)',
                                fontSize: 12,
                                marginTop: 4,
                            }}
                        >
                            Add Home, Work, or Hangouts.
                        </Text>
                    </View>
                )}

                {/* Spot cards */}
                {spots.map((spot) => {
                    const inWindow = isWithinSchedule(spot.schedule);
                    return (
                    <View
                        key={spot.id}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: spot.isActive ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.3)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.06)',
                            borderRadius: 16,
                            padding: 14,
                            opacity: spot.isActive ? 1 : 0.65,
                        }}
                    >
                        {/* Emoji box */}
                        <TouchableOpacity onPress={() => handleStartEdit(spot)} activeOpacity={0.7}>
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.06)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: spot.isActive ? 1 : 0.5,
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>{spot.emoji}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Info */}
                        <TouchableOpacity
                            style={{ flex: 1, marginLeft: 12 }}
                            onPress={() => handleStartEdit(spot)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={{
                                    color: spot.isActive ? COLORS.fog : 'rgba(242,244,246,0.5)',
                                    fontSize: 15,
                                    fontWeight: '700',
                                }}
                            >
                                {spot.name}
                            </Text>
                            <Text
                                style={{
                                    color: 'rgba(242,244,246,0.35)',
                                    fontSize: 10,
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1,
                                    marginTop: 2,
                                }}
                            >
                                {spot.radius}m Radius
                                {spot.schedule ? ` · ${formatSchedule(spot.schedule)}` : ''}
                            </Text>
                            {spot.isActive && spot.schedule && !inWindow && (
                                <Text
                                    style={{
                                        color: '#F59E0B',
                                        fontSize: 10,
                                        fontWeight: '700',
                                        marginTop: 2,
                                    }}
                                >
                                    Outside hours — inactive right now
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {/* Eye toggle */}
                            <TouchableOpacity
                                onPress={() => handleToggle(spot)}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    backgroundColor: spot.isActive ? 'rgba(46,92,255,0.12)' : 'rgba(255,255,255,0.04)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                activeOpacity={0.7}
                            >
                                {spot.isActive ? (
                                    <EyeIcon size={16} color={COLORS.signal} />
                                ) : (
                                    <EyeOffIcon size={16} color="#6B7280" />
                                )}
                            </TouchableOpacity>
                            {/* Edit */}
                            <TouchableOpacity
                                onPress={() => handleStartEdit(spot)}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                activeOpacity={0.7}
                            >
                                <EditIcon size={14} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    );
                })}

                {/* Footer hint */}
                <Text
                    style={{
                        color: 'rgba(242,244,246,0.25)',
                        fontSize: 12,
                        textAlign: 'center',
                        lineHeight: 18,
                        marginTop: 12,
                        paddingHorizontal: 16,
                    }}
                >
                    You are only visible to friends on the map when you are physically
                    inside one of your active places.
                </Text>
            </ScrollView>
        </View>
    );

    // ── CREATE / EDIT view ────────────────────────────────────────────────────

    const renderForm = () => (
        <View style={{ flex: 1 }}>
            {/* Header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingTop: 56,
                    paddingBottom: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                }}
            >
                <TouchableOpacity onPress={handleBack} style={{ marginRight: 10 }} activeOpacity={0.7}>
                    <Text style={{ color: 'rgba(242,244,246,0.5)', fontSize: 22 }}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            color: 'rgba(242,244,246,0.4)',
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            marginBottom: 2,
                        }}
                    >
                        Settings
                    </Text>
                    <Text style={{ color: COLORS.fog, fontSize: 22, fontWeight: '800' }}>
                        {mode === 'EDIT' ? 'Edit Place' : 'New Place'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onClose}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={{ color: COLORS.fog, fontSize: 18, opacity: 0.6 }}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 24 }}>
                {/* Name */}
                <View>
                    <Text
                        style={{
                            color: 'rgba(242,244,246,0.4)',
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            marginBottom: 8,
                        }}
                    >
                        Place Name
                    </Text>
                    <TextInput
                        value={form.name}
                        onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                        placeholder="e.g. Home Base"
                        placeholderTextColor="rgba(242,244,246,0.2)"
                        autoFocus
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            color: COLORS.fog,
                            fontSize: 16,
                            fontWeight: '600',
                        }}
                    />
                </View>

                {/* Emoji grid */}
                <View>
                    <Text
                        style={{
                            color: 'rgba(242,244,246,0.4)',
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            marginBottom: 8,
                        }}
                    >
                        Map Icon
                    </Text>
                    <View
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.06)',
                            borderRadius: 14,
                            padding: 10,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 6,
                        }}
                    >
                        {SPOT_ICONS.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={() => setForm((f) => ({ ...f, emoji }))}
                                style={{
                                    width: '18%',
                                    aspectRatio: 1,
                                    borderRadius: 10,
                                    backgroundColor:
                                        form.emoji === emoji ? 'rgba(255,255,255,0.15)' : 'transparent',
                                    borderWidth: form.emoji === emoji ? 1 : 0,
                                    borderColor: 'rgba(255,255,255,0.4)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: [{ scale: form.emoji === emoji ? 1.1 : 1 }],
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 22 }}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Radius */}
                <RadiusChips
                    value={form.radius}
                    onChange={(radius) => setForm((f) => ({ ...f, radius }))}
                />

                {/* Active hours (optional weekly schedule) */}
                <ScheduleFields
                    value={form}
                    onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                />

                {/* Map */}
                <View>
                    <Text
                        style={{
                            color: 'rgba(242,244,246,0.4)',
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: 2,
                            marginBottom: 8,
                        }}
                    >
                        Location — tap map or drag pin
                    </Text>
                    <View style={{ height: 240, borderRadius: 16, overflow: 'hidden' }}>
                        {renderMap()}
                    </View>
                </View>

                {/* Save */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={!form.name.trim() || saving}
                    style={{
                        backgroundColor: form.name.trim() && !saving ? COLORS.signal : 'rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        shadowColor: COLORS.signal,
                        shadowOpacity: form.name.trim() ? 0.3 : 0,
                        shadowRadius: 12,
                        elevation: 4,
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ fontSize: 16 }}>✓</Text>
                    <Text
                        style={{
                            color: form.name.trim() && !saving ? '#fff' : 'rgba(242,244,246,0.25)',
                            fontSize: 15,
                            fontWeight: '800',
                        }}
                    >
                        {saving ? 'Saving...' : mode === 'EDIT' ? 'Save Changes' : 'Create Place'}
                    </Text>
                </TouchableOpacity>

                {/* Delete (edit mode only) */}
                {mode === 'EDIT' && (
                    <TouchableOpacity
                        onPress={handleDelete}
                        style={{
                            backgroundColor: 'rgba(239,68,68,0.1)',
                            borderRadius: 12,
                            paddingVertical: 13,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 13 }}>🗑</Text>
                        <Text
                            style={{
                                color: '#EF4444',
                                fontSize: 13,
                                fontWeight: '700',
                            }}
                        >
                            Remove Place
                        </Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={{ flex: 1, backgroundColor: '#0F1115' }}>
                {mode === 'LIST' ? renderList() : renderForm()}
            </View>
        </Modal>
    );
}
