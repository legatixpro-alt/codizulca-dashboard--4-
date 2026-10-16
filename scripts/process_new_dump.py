import csv
import json
import re

# We will save the provided batch to a file and merge it properly with any existing surveys, ensuring full deduping and normalization.
print("Starting survey processor...")
