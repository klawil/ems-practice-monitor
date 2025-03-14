import Link from "next/link";
import { Button, Col, Container, Row, Image } from "react-bootstrap";
import styles from './page.module.css';

export default function Home() {
  return (
    <Container>
      <Row>
        <h1 className="text-center">Select a Role</h1>
      </Row>
      <Row>
        <Col md={6} xs={12} className="d-grid gap-2 mt-3">
          <Link href="/monitor" className={styles.imageContainer}>
            <Image
              className={styles.image}
              src="/monitor-blank.png"
              alt="Monitor screenshot"
              rounded
              thumbnail
            />
          </Link>
          <Button href="/monitor">Monitor</Button>
        </Col>
        <Col md={6} xs={12} className="d-grid gap-2 mt-3">
          <Link href="/manager" className={styles.imageContainer}>
            <Image
              className={styles.image}
              src="/manager-blank.png"
              alt="Manager screenshot"
              rounded
              thumbnail
            />
          </Link>
          <Button href="/manager">Manager</Button>
        </Col>
      </Row>
    </Container>
  );
}
