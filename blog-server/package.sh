#!/usr/bin/env bash
TMP_NAME=project3
TMP_DIR=/tmp/${TMP_NAME}
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#error function
function error_exit()
{
   echo -e "ERROR: $1" 1>&2
   rm -rf ${TMP_DIR}
   exit 1
}

# make sure running in container
if [ `whoami` != "cs144" ]; then
    error_exit "You need to run this script within the container"
fi

# clean any existing files
rm -rf ${TMP_DIR}
mkdir ${TMP_DIR}

# change to dir contains this script
cd $DIR

# check file existence
if [ -f "project3.zip" ]; then
    rm -f project3.zip
fi

if [ ! -f "TEAM.txt" ]; then
    error_exit "Missing $DIR/TEAM.txt"
fi

if [ ! -f "db.sh" ]; then
    error_exit "Missing $DIR/db.sh"
fi
# check the format of TEAM.txt
VALID_UID=$(grep -E "^[0-9]{9}\s*$" TEAM.txt)
if [ -z "${VALID_UID}" ]; then
    error_exit "No valid UID was found in TEAM.txt.\nInclude one 9-digit UID per line. No spaces or dashes, please."
fi
NON_UID=$(grep -v -E "^[0-9]{9}\s*$" TEAM.txt)
if [ -n "${NON_UID}" ]; then
    error_exit "Following lines are invalid in TEAM.txt\n${NON_UID}\nInclude one 9-digit UID per line. No spaces or dashes, please."
fi

zip -r project3.zip . -x 'node_modules/*' package.sh
if [ $? -ne 0 ]; then
    error_exit "Create project3.zip failed, check for error messages in console."
fi

# unzip the packaged file
"Testing your project3.zip for basic sanity check..."
cd $TMP_DIR
unzip $DIR/project3.zip

# run npm install
"Installing dependent node modules..."
npm install

# check if mongodb server is running
pgrep mongo > /dev/null
if [ $? -ne 0 ]; then
   echo "MongoDB server is not running. Starting the server..."
   echo "password" | sudo -S mongod --fork --logpath /var/log/mongodb/mongodb.log
fi

# drop all collections in BlogServer database
echo "Deleting all documents in BlogServer database..."
cat << EOF | mongo
    use BlogServer;
    db.dropDatabase();
EOF

# load initial documents to mongodb
echo "Loading initial documents to MongoDB using your db.sh..."
mongo < ./db.sh

# run the server
echo "Running your blog server..."
npm start &
if [ $? -ne 0 ]; then
    error_exit "Failed to run your blog server. Is your code in a runable state? Are you running another server at port 3000?"
fi
PID=$!
sleep 5

#Below is the python testing script for project 3
#NOTE: when marking your project we will add a few addtional test cases to cover all the spec requirements

python3 << ENDMARKER

import urllib
import requests
import pymongo
from pymongo import MongoClient
from html.parser import HTMLParser
from html.entities import name2codepoint
import random

# database content for test cases (username_postid)
cs144_1 = "Hello, world!"
cs144_2 = "I am here."
user2_7 = "gotta do my homework"
user2_others = "today's a nice day"

# set up connection
gurl = 'http://localhost:3000/'

conn = MongoClient('localhost', 27017)
db = conn.BlogServer
post_set = db.Posts
print("UID of team members:")
file = open("TEAM.txt")
for line in file:
    print(line)
print('npm start and db.sh success\n')
# npm start and db initilizing: 30 points
score = 30

# test public URLs: 20 points

def test_requests(url, parameter=None, content=None, cook=None, method="GET", time=3):
    r = requests.Response
    r.test = ""
    r.status_code = -1
    try:
        if method == "GET":
            r = requests.get(url, params=parameter, cookies=cook, timeout=time)
            r.raise_for_status()
        elif method == "POST":
            r = requests.post(url, cookies=cook, json=content, timeout=time)
            r.raise_for_status()
        elif method == "PUT":
            r = requests.put(url, cookies=cook, json=content, timeout=time)
            r.raise_for_status()
        elif method == "DELETE":
            r = requests.delete(url, cookies=cook, timeout=time)
            r.raise_for_status()
    except requests.exceptions.HTTPError as err:
        print(err)
    except requests.exceptions.ConnectionError as errc:
        print("Error Connecting:", errc)
    except requests.exceptions.Timeout as errt:
        print("Timeout Error:", errt)
    except requests.exceptions.RequestException as err:
        print("OOps: Something Else", err)
    return r


# Test Case1 (5 points): check if request for user cs144's postid 1 returns correct content
r1 = test_requests(gurl + 'blog/cs144/1')
if r1.text.find("Hello, world!"):
    score += 5
else:
    print("Test #1: failed -5 points\n")

# Test Case2 (5 points): check if request for user cs144's postid 1 returns correct status code 200
r2 = test_requests(gurl + 'blog/cs144/1')
if r2.status_code == 200:
    score += 5
else:
    print("Test #2: failed -5 points\n")

# Test Case3 (5 points): list all blogs created by a user
r3 = test_requests(gurl + 'blog/cs144')
posts1 = set(['Title 1', 'Title 2', cs144_1, cs144_2])
isright1 = True
for x in posts1:
    if r3.text.find(x) == -1:
        isright1 = False
        break
if isright1 == True:
    score += 5
else:
    print("Test #3: failed -5 points\n")

# Test Case4 (5 points): check if request for list of user2's posts starting from postid 3 can be displayed with correct content
posts2 = set([user2_7, user2_others])
isright2 = True
r4 = test_requests(gurl + 'blog/user2?start=3')
for x in posts2:
    if r4.text.find(x) == -1:
        isright2 = False
        break
if isright2 == True:
    # check if there is next button to access subsequent posts
    if r4.text.find('id="next"'):
        score += 5
    else:
        score += 3
        print("Test #4: partial failed -2 points\n")
else:
    print("Test #4: failed -5 points\n")

# generate cookies of each user
login_body1 = {'username': 'cs144',
               'password': 'password', 'redirect': '/blog/cs144/'}
login_body2 = {'username': 'user2',
               'password': 'blogserver', 'redirect': '/blog/user2/'}
session = requests.Session()
response = session.post(gurl + 'login', data=login_body1)
cook1 = session.cookies.get_dict()
response2 = session.post(gurl + 'login', data=login_body2)
cook2 = session.cookies.get_dict()
cook3 = dict()
cook3['jwt'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MjA2Mjg4MTgsInVzciI6ImNzMTQ0IiwiaWF0IjoxNTIwNjIxNjE4fQ.cruUDur0V3ON17CiewVbenJSzXATzSK75x47CbHotlk'

# test authentication: 10 points

# Test Case5: Access user cs144's blogs, wrong cookie, return 401
r5 = test_requests(gurl + 'api/cs144', cook=cook2)
if r5.status_code == 401:
    score += 5
else:
    print("Test #5: failed -5 points\n")

# test login: 10 points
login_pred1 = {'username': 'cs144',
               'password': 'password', 'redirect': '/blog/cs144/'}

# Test Case7: successful login, shows all blogs of the user
r7 = requests.post(gurl+'login', data=login_pred1)
if r7.status_code != 200:
    print("Test #7: failed -5 points\n")
else:
    if r7.text.lower().find('i am here') == -1:
        score += 3
        print("Test #7: partial failed -2 point\n")
    else:
        score += 5
login_pred2 = {'username': 'user2',
               'password': 'password', 'redirect': '/blog/user2/'}

# Test Case8: unsuccessful login, return 401, show html page with username and password input field

# define html parser functions
class MyHTMLParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.has_username = False
        self.has_password = False
    def handle_starttag(self, tag, attrs):
        for attr in attrs:
            if attr[0] == 'name' and attr[1] == 'username':
                self.has_username = True
            if attr[0] == 'name' and attr[1] == 'password':
                self.has_password = True

parser = MyHTMLParser()
r8 = requests.post(gurl+'login', data=login_pred2)
parser.feed(r8.text.lower())

if r8.status_code != 401:
    print("Test #8: failed -5 points\n")
else:
    # if r8.text.lower().find('username') != -1 or r8.text.lower().find('login') != -1:
    if parser.has_username and parser.has_password:
        score += 5
    else:
        score += 3
        # note: there might be wrong judgement here
        print("Test #8: partial failed -2 points\n")

# test apis: 50 points

# get all blogs from a user:

# Test Case9: unauthorized user, return 400
r9 = test_requests(gurl + 'api/user2')
if r9.status_code >= 400:
    score += 5
else:
    print("Test #9: failed -5 points\n")

# Test Case10: authorized user, return user's blogs, check if blogs match database
r10 = test_requests(gurl + 'api/cs144', cook=cook1)
res1 = set()
try:
    for y in r10.json():
        res1.add(y['postid'])
except ValueError as err:
    print(err)
res2 = set()
for x in post_set.find({'username': 'cs144'}):
    res2.add(int(x['postid']))
if (res1 == res2):
    score += 5
else:
    print("Test #10: failed -5 points\n")

# Test Case11: request an existing blog, return 200
r11 = test_requests(gurl + 'api/cs144/2', cook=cook1)
try:
    if r11.status_code == 200:
        score += 5
    else:
        print("Test #11: failed -5 points\n")
except ValueError as err:
    print(err)

# Test Case13: post: create new blog
hash1 = str(random.getrandbits(32))
content1 = {'title': 'new post', 'body': hash1}
r13 = test_requests(gurl + 'api/cs144/9', cook=cook1,
                    content=content1, method="POST")
# check database if inserted successfully
res = post_set.find_one({'username': 'cs144', 'postid': 9})
# print ("response body: ",res['body'])
if r13.status_code == 201 and res != None and res['body'] == content1['body']:
    score += 5
else:
    print("Test #13: failed -5 points\n")

# Test Case14: insert post, if post already exist, return 400
r14 = test_requests(gurl + 'api/cs144/2', cook=cook1,
                    content=content1, method="POST")
res = post_set.find_one({'username': 'cs144', 'postid': 2})
if r14.status_code == 400:
    if res == None or res['body'] == content1['body']:
        print("Test #14: failed -5 points\n")
    else:
        score += 5
else:
    print("Test #14: failed -5 points\n")

# update


# Test Case15: update an existing post, return 200
hash2 = str(random.getrandbits(32))
content2 = {'title': 'update post', 'body': hash2}
r15 = test_requests(gurl + 'api/cs144/2', cook=cook1,
                    content=content2, method="PUT")
res = post_set.find_one({'username': 'cs144', 'postid': 2})
if r15.status_code == 200 and res['title'] == content2['title'] and res['body'] == content2['body']:
    score += 5
else:
    print("Test #15: failed -5 points\n")


# delete

# Test Case17: if delete successfully, return 204
r17 = test_requests(gurl + 'api/cs144/1', cook=cook1, method="DELETE")
res = post_set.find_one({'username': 'cs144', 'postid': 1})
if r17.status_code == 204 and res == None:
    score += 5
else:
    print("Test #17: failed -5 points\n")
print("Total Score: " + str(score) + " out of 100.\n")

ENDMARKER


# kill npm process and the node server
echo "Stopping the node server..."
kill $PID
kill `pgrep node`

# remove temp files
cd $DIR
rm -rf $TMP_DIR

echo "[SUCCESS] Created '$DIR/project3.zip', please submit it to CCLE."

exit 0
