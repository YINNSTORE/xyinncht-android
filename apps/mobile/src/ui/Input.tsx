import React, { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { T } from './T';

type Props = TextInputProps & { label?: string; error?: string | null };

export const Input = React.forwardRef<TextInput, Props>(function Input({ label, error, style, ...rest }, ref) {
  const { theme, fontFamily, tokens } = useTheme();
  const [focus, setFocus] = useState(false);
  const c = theme.colors;
  return (
    <View style={{ gap: 6 }}>
      {label ? <T size="sm" weight="medium">{label}</T> : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        {...rest}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
        style={[
          {
            minHeight: 48, borderRadius: theme.radius.md, borderWidth: focus ? 2 : 1,
            borderColor: error ? c.danger : focus ? c.accent : c.borderInput,
            backgroundColor: c.surface, color: c.text, paddingHorizontal: 14,
            fontSize: tokens.scales.fontSize.md * theme.fontScale, fontFamily: fontFamily('regular'),
          },
          style,
        ]}
      />
      {error ? <T size="sm" color={c.danger}>{error}</T> : null}
    </View>
  );
});
