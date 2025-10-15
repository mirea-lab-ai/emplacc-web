'use client';

import Panel from '@/components/ui/Panel';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyHelpRequests, UIHelpRequest, completeHelpRequest } from '@/features/reports/api';
import { isAuthed, getUserId } from '@/lib/auth';
import CompleteHelpRequestModal from './CompleteHelpRequestModal';

export type HelpReq = {
  id: string;
  from: string;
  text?: string;
};

export default function HelpRequests() {
  const [i, setI] = useState(0);
  const [fetched, setFetched] = useState<UIHelpRequest[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  useEffect(() => {
    if (!isAuthed() || !getUserId()) return;
    fetchMyHelpRequests().then(setFetched).catch(() => setFetched([]));
  }, []);
  const list: HelpReq[] = useMemo(() => {
    return fetched.map((r) => ({ id: r.id, from: r.authorName ?? 'Пользователь', text: r.description }));
  }, [fetched]);
  const has = list.length > 0;

  const handleCompleteClick = () => {
    setShowCompleteModal(true);
  };

  const handleCompleteConfirm = async () => {
    if (!has || isCompleting) return;
    
    setIsCompleting(true);
    try {
      await completeHelpRequest(list[i].id);
      // Обновляем список после успешного завершения
      const updatedFetched = fetched.filter(item => item.id !== list[i].id);
      setFetched(updatedFetched);
      
      // Если текущий индекс больше не валиден, сбрасываем на 0
      if (i >= updatedFetched.length) {
        setI(0);
      }
      
      setShowCompleteModal(false);
    } catch (error) {
      console.error('Ошибка при завершении просьбы о помощи:', error);
      alert('Ошибка при завершении просьбы о помощи. Попробуйте еще раз.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCompleteCancel = () => {
    setShowCompleteModal(false);
  };

  return (
    <Panel p={5} h="full" display="flex" flexDirection="column">
      <Flex mb={2} align="flex-start" justify="space-between">
        <Box>
          <Heading size="md">Просьбы о помощи</Heading>
          {has && (
            <Text fontSize="sm" color="gray.300" mt={1}>
              {i + 1} из {list.length}
            </Text>
          )}
        </Box>
        {has && (
          <Flex align="center" gap={2}>
            <Button
              size="sm"
              fontWeight="bold"
              colorScheme="green"
              variant="solid"
              onClick={() => setI((i - 1 + list.length) % list.length)}
              aria-label="Назад"
            >
              ←
            </Button>
            <Button
              size="sm"
              fontWeight="bold"
              colorScheme="green"
              variant="solid"
              onClick={() => setI((i + 1) % list.length)}
              aria-label="Вперёд"
            >
              →
            </Button>
          </Flex>
        )}
      </Flex>

      <Box flex="1" minH={0} position="relative">
        {!has ? (
          <Flex
            h="full"
            align="center"
            justify="center"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.100"
            color="gray.300"
            backdropFilter="blur(10px)"
          >
            Вас никто не просил о помощи
          </Flex>
        ) : (
          <Box
            h="full"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.100"
            color="white"
            backdropFilter="blur(10px)"
            p={3}
            fontSize="sm"
            overflow="auto"
            position="relative"
          >
            <Text color="gray.300">Просит:</Text>
            <Text fontWeight="semibold">{list[i].from}</Text>
            {list[i].text && (
              <Box mt={2}>
                <Text color="gray.300">Описание:</Text>
                <Text fontWeight="medium">{list[i].text}</Text>
              </Box>
            )}

            <Box position="absolute" bottom={3} right={3}>
              <Button
                size="sm"
                colorScheme="green"
                fontWeight="semibold"
                onClick={handleCompleteClick}
                loading={isCompleting}
                loadingText="..."
              >
                Выполнить
              </Button>
            </Box>
          </Box>
        )}
      </Box>
      
      <CompleteHelpRequestModal
        open={showCompleteModal}
        onClose={handleCompleteCancel}
        onConfirm={handleCompleteConfirm}
        isCompleting={isCompleting}
      />
    </Panel>
  );
}
