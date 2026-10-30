# Private Diabetes Prediction

This project tests a simple idea: can a small neural network make a prediction without the server seeing the values it receives?

The model uses four inputs: HbA1c, fasting glucose, post-meal glucose, and insulin. It is trained locally on a synthetic diabetes dataset from Hugging Face. For a prediction, the client encrypts the inputs with TenSEAL, sends them to a local FastAPI server, and decrypts the returned score. The server has the model weights and public encryption context, but not the client's secret key.

## Getting started

Create and activate a virtual environment, then install the packages:

```bash
python -m venv .venv
```

On Windows:

```powershell
.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Get the data and train

```bash
python prepare_data.py
python train_model.py
```

The first command downloads the dataset and writes `prepared_diabetes.csv`. The second trains the network and saves its weights and scaling values in `model.json`. The printed accuracy is measured on a held-out part of the same synthetic dataset.

## Start the app

Open two terminals in the project folder and activate the virtual environment in both. Start the server in the first terminal:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

Then run the client in the second terminal:

```bash
python client.py
```

Enter the four measurements when prompted. The prediction is a basic demonstration using generated data; it should not be used to make health decisions.
