from pathlib import Path

from datasets import load_dataset

OUTPUT = Path(__file__).with_name("prepared_diabetes.csv")
SOURCE_COLUMNS = {
    "hba1c": "hba1c",
    "glucose_fasting": "fbg",
    "glucose_postprandial": "ogtt",
    "insulin_level": "insulin",
    "diagnosed_diabetes": "diabetes",
}


def main():
    data = load_dataset("MaxPrestige/Synthetic-Diabetes-Dataset", split="train")
    frame = data.to_pandas()[list(SOURCE_COLUMNS)].rename(columns=SOURCE_COLUMNS)
    frame = frame.dropna(subset=list(SOURCE_COLUMNS.values()))
    frame.to_csv(OUTPUT, index=False)
    print(f"Prepared data saved to {OUTPUT.name}")


if __name__ == "__main__":
    main()
