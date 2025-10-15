'use client';

import { Box, Button, Heading, Text } from '@chakra-ui/react';
import Modal from '@/components/ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  taskName: string;
  taskDescription: string;
};

export default function TaskDetailModal({ open, onClose, taskName, taskDescription }: Props) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose}>
      <Box
        w="full"
        maxW="lg"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="whiteAlpha.100"
        p={6}
        borderRadius="xl"
        boxShadow="lg"
        backdropFilter="blur(12px)"
      >
        <Box mb={4}>
          <Heading size="md" color="white" mb={2}>
            {taskName}
          </Heading>
          <Box h="1px" bgGradient="linear(to-r, green.300, transparent)" opacity={0.6} />
        </Box>

        <Box mb={6} color="gray.200">
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Описание
          </Text>
          <Text color="gray.300" whiteSpace="pre-wrap" lineHeight="tall">
            {taskDescription || 'Описание отсутствует'}
          </Text>
        </Box>

        <Box display="flex" justifyContent="flex-end">
          <Button colorScheme="green" fontWeight="semibold" onClick={onClose}>
            Закрыть
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
