from conftest import make_resume_payload, unique_user_id


def test_create_and_list_resumes(client):
    user = unique_user_id()
    res = client.post("/api/resumes", json={"userId": user, "title": "My Resume", "data": make_resume_payload(), "template": "modern"})
    assert res.status_code == 200, res.text
    created = res.json()
    assert created["id"]
    assert created["data"]["contact"]["fullName"] == "Jane Doe"

    listed = client.get(f"/api/resumes?userId={user}").json()
    assert any(r["id"] == created["id"] for r in listed)


def test_get_resume_requires_ownership(client):
    owner = unique_user_id()
    other = unique_user_id("other")
    created = client.post("/api/resumes", json={"userId": owner, "title": "T", "data": make_resume_payload()}).json()

    assert client.get(f"/api/resumes/{created['id']}?userId={owner}").status_code == 200
    assert client.get(f"/api/resumes/{created['id']}?userId={other}").status_code == 404


def test_update_requires_ownership(client):
    owner = unique_user_id()
    other = unique_user_id("other")
    created = client.post("/api/resumes", json={"userId": owner, "title": "T", "data": make_resume_payload()}).json()

    body = {"userId": other, "title": "Hijacked"}
    assert client.put(f"/api/resumes/{created['id']}", json=body).status_code == 404

    ok = client.put(f"/api/resumes/{created['id']}", json={"userId": owner, "title": "Updated"}).json()
    assert ok["title"] == "Updated"


def test_delete_requires_ownership(client):
    owner = unique_user_id()
    other = unique_user_id("other")
    created = client.post("/api/resumes", json={"userId": owner, "title": "T", "data": make_resume_payload()}).json()

    assert client.delete(f"/api/resumes/{created['id']}?userId={other}").status_code == 404
    assert client.delete(f"/api/resumes/{created['id']}?userId={owner}").status_code == 200

    assert client.delete(f"/api/resumes/{created['id']}?userId={owner}").status_code == 404


def test_clone_creates_variant_with_parent_id(client):
    user = unique_user_id()
    created = client.post("/api/resumes", json={"userId": user, "title": "Base", "data": make_resume_payload()}).json()

    cloned = client.post(
        f"/api/resumes/{created['id']}/clone",
        json={"userId": user, "title": "Base - DevOps variant", "targetRole": "DevOps Engineer"},
    )
    assert cloned.status_code == 200, cloned.text
    clone = cloned.json()
    assert clone["id"] != created["id"]
    assert clone["parentId"] == created["id"]
    assert clone["data"]["skills"] == created["data"]["skills"]
    assert clone["targetRole"] == "DevOps Engineer"

    # Cloning someone else's resume is forbidden.
    other = unique_user_id("other")
    assert client.post(f"/api/resumes/{created['id']}/clone", json={"userId": other}).status_code == 404


def test_insert_keywords_into_skills(client):
    user = unique_user_id()
    created = client.post("/api/resumes", json={"userId": user, "title": "T", "data": make_resume_payload(skills=[{"id": "s1", "name": "SQL"}])}).json()

    res = client.post(
        f"/api/resumes/{created['id']}/insert-keywords",
        json={"userId": user, "keywords": ["Kubernetes", "SQL", "Docker"]},
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    names = [s["name"] for s in data["skills"]]
    assert "Kubernetes" in names
    assert "Docker" in names
    assert names.count("SQL") == 1  # no duplicate insertion
    assert res.json()["insertedKeywords"] == ["Kubernetes", "Docker"]


def test_insert_keywords_into_summary(client):
    user = unique_user_id()
    created = client.post("/api/resumes", json={"userId": user, "title": "T", "data": make_resume_payload()}).json()

    res = client.post(
        f"/api/resumes/{created['id']}/insert-keywords",
        json={"userId": user, "keywords": ["agile"], "targetSection": "summary"},
    )
    assert res.status_code == 200, res.text
    assert "agile" in res.json()["data"]["summary"].lower()


def test_insert_keywords_respects_ownership(client):
    owner = unique_user_id()
    other = unique_user_id("other")
    created = client.post("/api/resumes", json={"userId": owner, "title": "T", "data": make_resume_payload()}).json()

    res = client.post(
        f"/api/resumes/{created['id']}/insert-keywords",
        json={"userId": other, "keywords": ["Kubernetes"]},
    )
    assert res.status_code == 404