'use client';

import { Box, Container, Grid, GridItem } from '@chakra-ui/react';
import HelpRequests from '@/components/main/HelpRequests';
import ForumUpdates from '@/components/main/ForumUpdates';
import ReportDownload from '@/components/main/ReportDownload';
import TodayPlan, { PlanItem } from '@/components/main/TodayPlan';
import YourTasks from '@/components/main/YourTasks';

const demoPlan: PlanItem[] = [
  { id: 'pl1', task: 'Emplacc', subtask: 'фронт', text: 'доделать панель админа' },
];

export default function Home() {
  return (
    <Box as="main" minH="100vh" bg="gray.900" color="white">
      <Container maxW="6xl" py={{ base: 6, md: 10 }}>
        <Grid
          templateColumns={{ base: '1fr', xl: '480px 1fr' }}
          gap={{ base: 6, md: 8 }}
          alignItems="stretch"
        >
          <GridItem>
            <YourTasks />
          </GridItem>

          <GridItem>
            <Grid
              templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
              templateRows={{ base: 'repeat(4, minmax(0, 1fr))', md: 'repeat(2, minmax(0, 1fr))' }}
              gap={{ base: 6, md: 5 }}
              minH={{ base: 'auto', md: '680px' }}
            >
              <GridItem>
                <HelpRequests />
              </GridItem>
              <GridItem>
                <ForumUpdates />
              </GridItem>
              <GridItem>
                <ReportDownload />
              </GridItem>
              <GridItem>
                <TodayPlan items={demoPlan} />
              </GridItem>
            </Grid>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}



