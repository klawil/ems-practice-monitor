import type { Metadata } from 'next'
import Monitor from "@/components/monitor/monitor";
import { Container } from 'react-bootstrap';
import styles from "./monitorPage.module.css";
 
export const metadata: Metadata = {
  title: 'Monitor',
};

export default function MonitorPage() {
  return (
    <Container
      fluid={true}
      className={styles.monitorContainer}
    >
      <Monitor />
    </Container>
  )
}
