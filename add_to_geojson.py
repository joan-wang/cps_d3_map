# -*- coding: utf-8 -*-
"""
Created on Mon Nov 20 20:46:05 2017

@author: JoanWang
"""

import pandas as pd
import numpy as np
import json

# Load relevant data files
def load_file(path):
    df = pd.read_csv(path, index_col="School_ID")
    return df

with open('data/Chicago Public Schools - School Locations SY1617.geojson') as f:
    schools = json.load(f)

with open('data/Chicago Public Schools - Safe Passage Routes SY1617.geojson') as f:
    routes = json.load(f)
  
progress1516 = load_file('data/Combined_1516.csv')
progress1617 = load_file('data/Combined_1617.csv')
num_crimes = load_file('data/schools_crimes.csv')
profile = load_file('data/Profile_1617.csv')
attendance = load_file('data/attendance_cleaned.csv')

# Turn school survey safety scores to numerical
scores = {'VERY WEAK': 0, 'WEAK': 1, 'NEUTRAL': 2, 'STRONG': 3, 'VERY STRONG': 4}
progress1516['School_Survey_Safety'].replace('NOT ENOUGH DATA', np.nan, inplace=True)
progress1617['School_Survey_Safety'].replace('NOT ENOUGH DATA', np.nan, inplace=True)
progress1516.replace({'School_Survey_Safety': scores}, inplace=True)
progress1617.replace({'School_Survey_Safety': scores}, inplace=True)

# Get list of schools with safe passage routes
sp_schools = []
for feature in routes['features']:
    sp_schools.append(feature['properties']['schoolid'])

# Join all datasets by school ID; only looking at schools in common between all
df = progress1516[['School_Survey_Safety']].join(progress1617[['Long_Name', 'School_Survey_Safety']], how='inner', lsuffix = '_1516', rsuffix = '_1617')
df = df.join(num_crimes[['num_crimes_16']])
df = df.join(profile[['Student_Count_Total']])
df = df.join(attendance[['2012', '2013', '2014', '2015', '2016', '2017']])


# Make additions to every features in schools json
to_remove = []
for idx, feature in enumerate(schools['features']):

    school_id = int(feature['properties']['school_id'])

    if school_id in df.index:
        school_row = df.loc[school_id]
        
        # Safe passage routes indicator
        if school_id in sp_schools:
            feature['properties']['safePassage'] = "Yes"
        else:
            feature['properties']['safePassage'] = "No"
        
        # Number of crimes nearby
        feature['properties']['numCrimes'] = str(school_row['num_crimes_16'])
    
        # Student enrollment
        feature['properties']['enrollment'] = str(school_row['Student_Count_Total'])
        
        # School survey safety scores
        feature['properties']['safety'] = [
                {'year': '2016', 'safety': str(float(school_row['School_Survey_Safety_1516']))},
                {'year': '2017', 'safety': str(float(school_row['School_Survey_Safety_1617']))}]
        
        # Attendance 2012-2017
        att = []
        for year in range(2012, 2018):
            att.append({'year': str(year), 'att': str(float(school_row[str(year)]))})
        feature['properties']['attendance'] = att
    
    else: # note index for deletion because school has incomplete data
        to_remove.append(idx)  

# Write updated schools json 
schools['features'] = [s for idx, s in enumerate(schools['features']) if idx not in to_remove]

with open('data/locations_updated.geojson', 'w') as f:
    json.dump(schools, f)
    