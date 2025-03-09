# EMS Practice Monitor

Simulates a LifePak 15 monitor for an improved EMS training scenario experience.

## Project Description

This project is built using React and NextJS. It consists of 2 parts:
1. **Monitor Screen**: Simulates a LifePak 15 monitor.
2. **Manager Screen**: Controls the vitals and waveforms displayed on the monitor.

The two parts communicate using a websocket API that can be run on the Next server for local development or powered by a Lambda function on AWS when deployed using the CDK.

[Live site](https://ems.klawil.net/)

## Features

- Simulates LifePak 15 monitor display
- Manager interface for controlling vitals and waveforms
- WebSocket communication between Monitor and Manager
- Local development and AWS deployment support

## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/klawil/ems-practice-monitor.git
    cd ems-practice-monitor
    ```

2. **Install dependencies**:
    ```bash
    yarn install
    ```

## Running Locally

1. **Start the development server**:
    ```bash
    yarn dev
    ```

## Deployment

1. **To add a custom domain**
  1a. **Create a certificate** in AWS ACM for the domain

  1b. **Create a `.env` file** with the following properties:
    ```env
    DOMAIN_NAME=your.domain.name
    SSL_CERT_ARN=your-ssl-cert-arn
    ```

2. **Authenticate with AWS**:
    Ensure you are authenticated with the appropriate AWS user.

3. **Bootstrap the CDK** (if necessary):
    ```bash
    npx cdk bootstrap
    ```

4. **Deploy the project**:
    ```bash
    yarn deploy
    ```

## Usage

1. **Navigate to the base URL** and select the role you want your current device to assume (monitor or manager)

2. **Connecting Monitor and Manager**:
    - Once a monitor is open, it will display a 5-character code
    - Enter this code into the manager interface to connect the two
    - A QR code is also displayed which can be used to open a manager interface for the monitor (this primarily works on AWS deployments)

3. **Using the Manager Interface**:
    - Use the sensors toggles to determine which sensors should be simulated as connected on the monitor
    - Use the vitals inputs to control the target value and range for each vital
    - Use the waveform inputs to control the parameters used for waveform generation
    - Click "Send to Monitor" to transfer the settings to the monitor
    - The monitor will adjust the displayed values towards the new targets at a pre-determined rate (it will not be instantaneous, especially for a large change)

## Contribution

Contributions are welcome! Please fork the repository and submit a pull request.

## Future Development
- [x] Create an AWS CDK stack that deploys the websocket server and static files on AWS
- [ ] Synchronize and align the SPO2 and EKG waveforms
- [ ] Add more options to simulate conditions in the SPO2 waveform
- [ ] Add more options to simulate conditions in the EKG waveforms
- [ ] Add support for more EKG waveforms (I, III, AVR, AVL, AVF)
- [ ] Add support for changing EKG waveform size
- [ ] Add alerts to the monitor (no breaths, check SPO2 sensor, disconnected leads)
- [ ] Allow the user to change which waveforms are displayed/where
- [ ] Simulate the BP cuff completely (pressure ramp)
- [ ] Simulate auto-scheduling the BP cuff

## License

This project is licensed under the MIT License.