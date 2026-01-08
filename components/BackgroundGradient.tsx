import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const BackgroundGradient = ({color, topOffset = 0}: {color: string, topOffset?: number}) => {
    return (
        <View style={StyleSheet.absoluteFill}>
            <Svg
                height="100%"
                width="100%"
                style={{ position: 'absolute', top: topOffset, left: 0, right: 0, bottom: 0 }}
            >
                <Defs>
                    <RadialGradient
                        id="radialGradient"
                        gradientUnits="objectBoundingBox"
                        cx={0.5}
                        cy={0.5}
                        r={1}
                    >
                        <Stop offset="0" stopColor={color} stopOpacity={0.2} />
                        <Stop offset="0.5" stopColor={color} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Rect
                    width="100%"
                    height="100%"
                    fill="url(#radialGradient)"
                />
            </Svg>
        </View>
    );
};

export default BackgroundGradient;