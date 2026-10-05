import { Linking } from 'react-native';

import { Text } from '@/components/ui/text';

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

type Props = { children: string; className?: string; linkClassName?: string };

// Texto con links que se pueden tocar, sin vista previa (spec 04, AC-16).
export function LinkedText({ children, className, linkClassName = 'underline' }: Props) {
  const parts = children.split(URL_PATTERN);
  return (
    <Text className={className}>
      {parts.map((part, i) =>
        URL_PATTERN.test(part) ? (
          <Text
            key={i}
            className={`${className ?? ''} ${linkClassName}`}
            onPress={() => Linking.openURL(part.startsWith('http') ? part : `https://${part}`)}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}
