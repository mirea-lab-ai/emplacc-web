'use client';

import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import Panel from '@/components/ui/Panel';
import TaskDetailModal from './TaskDetailModal';
import PlanItem from './PlanItem';
import { useUserReports } from '@/features/reports/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';

export type PlanItem = {
  id: string;
  task: string;
  subtask?: string;
  text?: string;
};

type TaskPlanItem = {
  taskId: string;
  taskName: string;
  description: string;
};

export default function TodayPlan({ items }: { items: PlanItem[] }) {
  const [selectedTask, setSelectedTask] = useState<{ name: string; description: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const userId = getUserId();

  // Получаем последний отчет пользователя
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useUserReports(userId, 1, 1, hasCreds);

  // Извлекаем plan_tomorrow из первого отчета
  const planItems = useMemo(() => {
    if (!reportsData?.reports?.[0]?.plan_tomorrow) return [];
    return reportsData.reports[0].plan_tomorrow.map((item: any) => ({
      taskId: item.task_id,
      description: item.description || '',
    }));
  }, [reportsData]);

  // Объединяем данные задач с планами
  const taskPlanItems: TaskPlanItem[] = useMemo(() => {
    if (!planItems.length) return [];
    
    return planItems.map((planItem: any) => ({
      taskId: planItem.taskId,
      taskName: 'Загрузка...', // Будем обновлять через отдельные запросы
      description: planItem.description,
    }));
  }, [planItems]);

  const handleTaskClick = (taskName: string, description: string) => {
    setSelectedTask({ name: taskName, description });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  // Если загружаемся, показываем индикатор загрузки
  if (reportsLoading) {
    return (
      <Panel p={5} h="full" display="flex" flexDirection="column">
        <Flex mb={2} align="center" justify="space-between">
          <Heading size="md">План из вашего прошлого отчета</Heading>
        </Flex>
        <Flex flex="1" minH={0} align="center" justify="center" color="gray.300">
          Загрузка планов...
        </Flex>
      </Panel>
    );
  }

  // Если есть ошибка, показываем её
  if (reportsError) {
    return (
      <Panel p={5} h="full" display="flex" flexDirection="column">
        <Flex mb={2} align="center" justify="space-between">
          <Heading size="md">План из вашего прошлого отчета</Heading>
        </Flex>
        <Flex flex="1" minH={0} align="center" justify="center" color="red.300">
          Ошибка загрузки: {reportsError.message}
        </Flex>
      </Panel>
    );
  }

  // Если нет авторизации, показываем мок данные
  if (!hasCreds) {
    return (
      <Panel p={5} h="full" display="flex" flexDirection="column">
        <Flex mb={2} align="center" justify="space-between">
          <Heading size="md">План из вашего прошлого отчета</Heading>
        </Flex>

        <Box flex="1" minH={0}>
          {items.length ? (
            <VStack
              as="ul"
              gap={2}
              align="stretch"
              h="full"
              overflowY="auto"
              pr={1}
              listStyleType="none"
            >
              {items.map((p) => (
                <Box
                  as="li"
                  key={p.id}
                  borderRadius="xl"
                  px={4}
                  py={2}
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  bg="whiteAlpha.100"
                  color="white"
                  backdropFilter="blur(10px)"
                >
                  <Flex align="baseline" justify="space-between" gap={3}>
                    <Text fontWeight="medium">{p.task}</Text>
                    {p.subtask && (
                      <Text
                        fontSize="xs"
                        borderRadius="lg"
                        px={3}
                        py={1}
                        color="green.200"
                        bg="rgba(16, 185, 129, 0.15)"
                        borderWidth="1px"
                        borderColor="rgba(16, 185, 129, 0.4)"
                      >
                        {p.subtask}
                      </Text>
                    )}
                  </Flex>
                  {p.text && (
                    <Text color="gray.300" fontSize="sm" mt={1}>
                      {p.text}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          ) : (
            <Flex
              h="full"
              align="center"
              justify="center"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              bg="blackAlpha.600"
              color="gray.300"
            >
              Вы не составили план в прошлом отчете
            </Flex>
          )}
        </Box>
      </Panel>
    );
  }

  return (
    <Panel p={5} h="full" display="flex" flexDirection="column">
      <Flex mb={2} align="center" justify="space-between">
        <Heading size="md">План из вашего прошлого отчета</Heading>
      </Flex>

      <Box flex="1" minH={0}>
        {taskPlanItems.length ? (
          <VStack
            as="ul"
            gap={2}
            align="stretch"
            h="full"
            overflowY="auto"
            pr={1}
            listStyleType="none"
          >
            {taskPlanItems.map((item) => (
              <PlanItem
                key={item.taskId}
                taskId={item.taskId}
                description={item.description}
                onClick={handleTaskClick}
              />
            ))}
          </VStack>
        ) : (
          <Flex
            h="full"
            align="center"
            justify="center"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.100"
            color="gray.300"
          >
            {reportsData ? 'Вы не составили план в прошлом отчете' : 'Нет данных отчетов'}
          </Flex>
        )}
      </Box>

      <TaskDetailModal
        open={showModal}
        onClose={handleCloseModal}
        taskName={selectedTask?.name || ''}
        taskDescription={selectedTask?.description || ''}
      />
    </Panel>
  );
}
