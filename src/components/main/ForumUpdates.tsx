'use client';

import Panel from '@/components/ui/Panel';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useAllProblems } from '@/features/problems/hooks';
import { getUserId, isAuthed } from '@/lib/auth';
import { useIsClient } from '@/hooks/useIsClient';
import type { UIProblem } from '@/features/problems/api';

export type ForumNote = {
  id: string;
  topic: string;
  text: string;
  href?: string;
};

export default function ForumUpdates() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data, isLoading, error } = useAllProblems(1, 10, hasCreds);
  const problems = (data ?? []) as UIProblem[];
  return (
    <Panel p={5} h="full" display="flex" flexDirection="column">
      <Box mb={2}>
        <Heading size="md">Форум</Heading>
      </Box>

      <Box flex="1" minH={0}>
        {isLoading ? (
          <Box display="grid" placeItems="center" h="full" color="gray.300">
            Загрузка проблем...
          </Box>
        ) : error ? (
          <Box display="grid" placeItems="center" h="full" color="red.300">
            Ошибка загрузки проблем
          </Box>
        ) : problems.length ? (
          <VStack
            as="ul"
            gap={2}
            align="stretch"
            h="full"
            overflowY="auto"
            pr={1}
          >
            {problems.map((problem) => (
              <Box
                as="li"
                key={problem.id}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                bg="whiteAlpha.100"
                color="white"
                backdropFilter="blur(10px)"
                px={4}
                py={3}
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                <Link href={`/forum?problem=${problem.id}`}>
                  <Text fontWeight="semibold">{problem.name}</Text>
                  {problem.description && (
                    <Text color="gray.300" fontSize="sm" lineClamp={2}>
                      {problem.description}
                    </Text>
                  )}
                  <Text color="gray.400" fontSize="xs" mt={1}>
                    {problem.createdAt ? new Date(problem.createdAt).toLocaleDateString() : ''}
                  </Text>
                </Link>
              </Box>
            ))}
          </VStack>
        ) : (
          <Box
            display="grid"
            placeItems="center"
            h="full"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.100"
            color="gray.300"
            backdropFilter="blur(10px)"
          >
            Проблем пока нет
          </Box>
        )}
      </Box>
    </Panel>
  );
}
