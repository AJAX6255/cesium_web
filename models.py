import datetime
import inspect
import sys

import peewee as pw
from playhouse.fields import ManyToManyField
from playhouse.shortcuts import model_to_dict
from json_util import to_json

from config import cfg


db = pw.PostgresqlDatabase(**cfg['database'], autocommit=True,
                           autorollback=True)

class BaseModel(pw.Model):
    def __str__(self):
        return to_json(self.__dict__())

    def __dict__(self):
        return model_to_dict(self, recurse=False, backrefs=False)

    class Meta:
        database = db


class Project(BaseModel):
    """
    ORM model of the Project table
    """
    name = pw.CharField()
    description = pw.CharField(null=True)
    created = pw.DateTimeField(default=datetime.datetime.now)

    @staticmethod
    def all(username):
        return (Project
                    .select()
                    .join(UserProject)
                    .where(UserProject.username == username)
                    .order_by(Project.created))

    @staticmethod
    def add(name, description, username):
        with db.atomic():
            p = Project.create(name=name, description=description)
            UserProject.create(username=username, project=p)


class TimeSeries(BaseModel):
    """
    ORM model of the TimeSeries table
    """
    filename = pw.CharField()
    created = pw.DateTimeField(default=datetime.datetime.now)


class Dataset(BaseModel):
    """
    ORM model of the Dataset table
    """
    project = pw.ForeignKeyField(Project, on_delete='CASCADE')
    name = pw.CharField()
    created = pw.DateTimeField(default=datetime.datetime.now)
    time_series = ManyToManyField(TimeSeries)


class UserProject(BaseModel):
    username = pw.CharField()
    project = pw.ForeignKeyField(Project, related_name='owners',
                                 on_delete='CASCADE')

    class Meta:
        indexes = (
            (('username', 'project'), True),
        )


TimeSeriesDataset = Dataset.time_series.get_through_model()

models = [
    obj for (name, obj) in inspect.getmembers(sys.modules[__name__])
    if inspect.isclass(obj) and issubclass(obj, BaseModel)
    and not obj == BaseModel
]


def create_tables():
    db.create_tables(models, safe=True)


def drop_tables():
    db.drop_tables(models, safe=True, cascade=True)


if __name__ == "__main__":
    print("Dropping all tables...")
    drop_tables()
    print("Creating tables: {}".format([m.__name__ for m in models]))
    create_tables()

    print("Inserting dummy projects...")
    for i in range(5):
        p = Project.create(name='test project {}'.format(i))
        print(p)


    print("Creating dummy project owners...")
    for i in range(3):
        p = Project.get(Project.id == i + 1)
        u = UserProject.create(username='testuser@gmail.com', project=p)
        print(u)

    print('ASSERT User should have 3 projects')
    print(to_json(p.all('testuser@gmail.com')))
    assert(len(list(p.all('testuser@gmail.com'))) == 3)