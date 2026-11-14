if __name__ == "__main__":
    from prediction.model_loader import (
        DIABETES_MODEL,
        LIVER_MODEL,
        CARDIOVASCULAR_MODEL,
    )

    print("Diabetes:")
    print(getattr(DIABETES_MODEL, "feature_names_in_", "N/A"))

    print("\nLiver:")
    print(getattr(LIVER_MODEL, "feature_names_in_", "N/A"))

    print("\nCardio:")
    print(getattr(CARDIOVASCULAR_MODEL, "feature_names_in_", "N/A"))