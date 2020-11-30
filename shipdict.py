class Position():
    """
    latitude, longitude, timestamp
    """
    def __init__(self, latitude, longitude, timestamp):
        self.latitude = latitude
        self.longitude = longitude
        self.timestamp = timestamp

    def d_m_s(self, f):
        """
        makes a float readable; e.g. transforms 2.5 into 2.30'00'' 
        we avoid using ° to keep things simple
        input is assumed positive
        """
        d = int (f)
        m = int((f-d)*60)
        s = int( (f-d)*3600 - 60*m)
        return f"{d:02d}.{m:02d}'{s:02d}''"
    
    def __str__(self):
        #<49.27'18'' N 02.32'04'' W @ 2013-10-01T08:30:00>
        latitude = self.d_m_s(abs(self.latitude))
        longitude = self.d_m_s(abs(self.longitude))
        return f"<{latitude} N {longitude} W @ {self.timestamp}>"

    def __repr__(self):
        return self.__str__()

class Ship():
    """
    Ship datamodel : id , name as an option
    """
   
    def __init__(self, ID, name=None, country=None):
        self.ID = ID
        self.name = name
        self.positions = []

    def add_position(self, latitude, longitude, timestamp):
        self.positions.append(Position(latitude, longitude, timestamp))
        self.sort_position()

    def sort_position(self):
        self.positions.sort(key=lambda position: position.timestamp)


class ShipDict(dict):
    """
    Ship index
    """
    def new_boat(self, data):
        self.update({boat_id : Ship(boat_id, boat_name) for boat_id,boat_name in data})
    
    def add_chunk(self, trackdata, prefixe='', coordsFactor=100000, isRelative=True):
        latitude = None
        longitude = None
        timecode = 0
        for locdata in trackdata['loc']:
            try:
                time, lat, lng = locdata
            except:
                print(locdata)
                break
            timecode = time + (timecode if isRelative else 0)
            latitude = lat / coordsFactor + (latitude if isRelative and latitude else 0)
            longitude = lng / coordsFactor + (longitude if isRelative and longitude else 0)
            self[prefixe + str(trackdata['id'])].add_position(latitude,longitude, timecode)

    def sort(self):
        """
        Sort ship's position by chronological order
        """
        for ID in self:
            self[ID].sort_position()

    def all_ships(self):
        return [self[ID] for ID in self]

    def ships_by_name(self, ship_name):
        self = self.clean_unnamed()
        return [self[ID] for ID in self if self[ID].name == ship_name]
    

