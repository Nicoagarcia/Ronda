import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

// Uniwind solo aplica className a los componentes de React Native; los de terceros se envuelven.
const SafeAreaView = withUniwind(RNSafeAreaView);

type Props = ViewProps & { scroll?: boolean };

// Contenedor base de cada pantalla: fondo, márgenes y área segura.
export function Screen({ scroll, className, children, ...props }: Props) {
  const content = (
    <View className={`flex-1 gap-4 px-4 py-4 ${className ?? ''}`} {...props}>
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      {scroll ? <ScrollView contentContainerClassName="grow">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}
