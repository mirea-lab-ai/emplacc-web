'use client';

import Panel from '@/components/ui/Panel';
import { Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { exportReportsToExcel } from '@/features/reports/api';

export default function ReportDownload() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();

  // Устанавливаем даты по умолчанию (текущий месяц)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const handleDownload = async () => {
    if (!startDate || !endDate || isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      // Используем API функцию для экспорта
      const blob = await exportReportsToExcel(startDate, endDate);
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Ошибка при скачивании отчета:', error);
      alert('Ошибка при скачивании отчета. Попробуйте еще раз.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Panel p={5} h="full" display="flex" flexDirection="column">
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        Скачать отчет
      </Text>

      <Flex direction="column" flex="1" minH={0} gap={4}>
        <Stack gap={3}>
          <Field.Root disabled={isDownloading}>
            <Field.Label fontSize="sm" color="gray.300">
              Дата начала
            </Field.Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.200"
              color="white"
              _focus={{ borderColor: 'green.300', boxShadow: '0 0 0 1px rgba(74, 222, 128, 0.4)' }}
            />
          </Field.Root>

          <Field.Root disabled={isDownloading}>
            <Field.Label fontSize="sm" color="gray.300">
              Дата окончания
            </Field.Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.200"
              color="white"
              _focus={{ borderColor: 'green.300', boxShadow: '0 0 0 1px rgba(74, 222, 128, 0.4)' }}
            />
          </Field.Root>
        </Stack>

        <Button
          mt="auto"
          w="full"
          colorScheme="green"
          fontWeight="semibold"
          onClick={handleDownload}
          loading={isDownloading}
          loadingText="Скачиваем..."
          disabled={!startDate || !endDate}
        >
          Скачать отчет
        </Button>
      </Flex>
    </Panel>
  );
}
