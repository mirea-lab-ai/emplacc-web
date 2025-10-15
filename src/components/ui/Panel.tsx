'use client';

import { forwardRef } from 'react';
import { Box, type BoxProps } from '@chakra-ui/react';

type PanelProps = BoxProps;

const Panel = forwardRef<HTMLDivElement, PanelProps>(({ children, ...rest }, ref) => (
    <Box
        ref={ref}
        borderRadius="2xl"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="whiteAlpha.100"
        boxShadow="0 10px 40px -10px rgba(0, 0, 0, 0.6)"
        backdropFilter="blur(12px)"
        {...rest}
    >
        {children}
    </Box>
));

Panel.displayName = 'Panel';

export default Panel;
