from ..models import new_id


def mutation_id() -> str:
    return new_id("mut")
