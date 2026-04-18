import decorator

@decorator.decorator
def dec1(f, *a, **k):
    return f(*a, **k)

@decorator.decorator
def dec2(f, *a, **k):
    return f(*a, **k)

def target(x, y=1, z=2):
    pass

decorated = dec1(dec2(target))

print(f"Signature: {decorated.__code__.co_varnames}")
