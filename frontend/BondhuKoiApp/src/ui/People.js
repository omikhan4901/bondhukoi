import { Image, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase() || '?';
}

/** A round photo, or initials on the brand tint. */
export function Avatar({ name, url, size = 40, ring }) {
  const { c, fonts } = useTheme();
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: c.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: ring ? 2 : 0,
    borderColor: c.surface,
    overflow: 'hidden',
  };
  return (
    <View style={style} accessibilityLabel={name} accessible>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: size * 0.38, lineHeight: size * 0.46, color: c.brand }}>{size < 34 ? initials(name).slice(0, 1) : initials(name)}</Text>
      )}
    </View>
  );
}

/** Up to `max` overlapping avatars and a "+n". */
export function AvatarStack({ people = [], total, max = 4, size = 30 }) {
  const { c } = useTheme();
  const shown = people.slice(0, max);
  const extra = (total ?? people.length) - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size / 4 }}>
          <Avatar name={p.name} url={p.avatarUrl} size={size} ring />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            marginLeft: -size / 4,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: c.sunken,
            borderWidth: 2,
            borderColor: c.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" tone="muted" style={{ fontSize: 10 }}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const STATES = {
  here: { label: 'On campus', fg: 'here', bg: 'hereSoft', dot: 'hereDot' },
  circle: { label: 'Here', fg: 'here', bg: 'hereSoft', dot: 'hereDot' },
  away: { label: 'Away', fg: 'muted', bg: 'sunken', dot: 'away' },
  unknown: { label: 'Not updated', fg: 'muted', bg: 'sunken', dot: 'away' },
  off: { label: 'Not sharing', fg: 'muted', bg: 'sunken', dot: 'away' },
  paused: { label: 'Sharing paused', fg: 'paused', bg: 'pausedSoft', dot: 'paused' },
};

/** "On campus" / "Away" / … as a small pill with a dot. `label` overrides the text. */
export function StatusPill({ state = 'away', label, size = 'sm' }) {
  const { c, radius } = useTheme();
  const s = STATES[state] || STATES.away;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: c[s.bg],
        borderRadius: radius.full,
        paddingHorizontal: size === 'lg' ? 12 : 8,
        paddingVertical: size === 'lg' ? 6 : 3,
      }}
    >
      <View style={{ width: size === 'lg' ? 8 : 6, height: size === 'lg' ? 8 : 6, borderRadius: 4, backgroundColor: c[s.dot] }} />
      <Text variant={size === 'lg' ? 'secondaryStrong' : 'caption'} tone={s.fg}>
        {label || s.label}
      </Text>
    </View>
  );
}

/** Words for a friend's presence, as the API describes it. */
export function presenceLabel(presence) {
  if (!presence) return { state: 'unknown', label: 'Not updated' };
  if (presence.state === 'here') {
    if (presence.circles?.length) {
      return { state: 'here', label: presence.onCampus ? `On campus · ${presence.circles[0].name}` : `At ${presence.circles[0].name}` };
    }
    return { state: 'here', label: 'On campus' };
  }
  return { state: presence.state, label: undefined };
}
