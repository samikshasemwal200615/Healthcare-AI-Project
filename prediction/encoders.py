LIVER_GENDER_MAP = {
    "Male": 1,
    "Female": 0,
    "male": 1,
    "female": 0,
}

CARDIO_GENDER_MAP = {
    "Male": 2,
    "Female": 1,
    "male": 2,
    "female": 1,
}


def liver_gender_encoder(gender: str) -> int:
    return LIVER_GENDER_MAP[gender]


def cardio_gender_encoder(gender: str) -> int:
    return CARDIO_GENDER_MAP[gender]


def bool_to_int(value: bool) -> int:
    return int(value)


