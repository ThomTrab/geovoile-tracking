import time
from selenium.webdriver import Firefox
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait
import requests
import json
import xml.etree.ElementTree as ET
from gpxpy.gpx import *
import random
import string
from argparse import ArgumentParser

from shipdict import ShipDict

sodebo = 'https://sodebo-voile.geovoile.com/'
vendeeglobe = 'https://tracking2020.vendeeglobe.org/'
gitana = 'http://gitana-team.geovoile.com/'

roots_url = [vendeeglobe, sodebo, gitana]

# Firefox Options
opts = Options()
opts.headless = True
assert opts.headless  # Operating in headless mode


class Merger:
    """
    Concatain tracking data from several geovoile.com tracking site
    """
    def __init__(self):
        """
        constructor creates an ArgumentParser object to implement main interface
        puts resulting args in self.args also creates an empty instance of
        ShipDict for merging incoming data
        """
        parser = ArgumentParser()
        parser.add_argument("-v", "--verbose", dest='verbose', default=False,
                            action='store_true',
                            help="Verbose mode")
        parser.add_argument("-s", "--ship", dest='ship_name', default=None,
                            action='store',
                            help="Restrict to ships by that name")
        parser.add_argument("-z", "--gzip", dest='gzip', default=False,
                            action='store_true',
                            help="Store kml output in gzip (KMZ) format")
        parser.add_argument("json_filenames", nargs='*')
        self.args = parser.parse_args()

        # the windows command line is a little lazy with filename expansion
        json_filenames = []
        for json_filename in self.args.json_filenames:
            if '*' not in json_filename:
                json_filenames.append(json_filename)
            else:
                json_filenames.extend(glob.glob(json_filename))
        self.args.json_filenames = json_filenames
  
        self.ship_dict = ShipDict()
        self.gpx = GPX()
        self.gpxx_color = [
            "Black",
            "DarkRed",
            "DarkGreen",
            "DarkYellow",
            "DarkBlue",
            "DarkMagenta",
            "DarkCyan",
            "LightGray",
            "DarkGray",
            "Red",
            "Green",
            "Yellow",
            "Blue",
            "Magenta",
            "Cyan",
            "White"
            ]

    def main(self, *args, **kwargs):
        urls = [url for url in args]
        self.get_data()
        self.export_as_gpx()

    def get_data(self, urls=roots_url):
        """
        Download data from urls and decode them as original data are encrypted
        Use inpage JS to retrieve data's urls and decode them
        Add prefixes to id as id are not unique accross tracking data from different site
        """
        with Firefox(options=opts) as driver:
            for root_url, prefixe in zip(roots_url, string.ascii_letters):
                driver.get(root_url)
                #Wait for page loading
                #TODO : find a better way to wait until page is fully loaded
                time.sleep(2)
                #Get url from page JS
                configData_url = root_url + driver.execute_script("return tracker._getRessourceUrl('config')")
                x = requests.get(configData_url)
                #Decode data usgin page JS
                configdata_xml = driver.execute_script("return new TextDecoder('utf-8').decode(new UInt8Array(arguments[0]))", list(x.content))
                #Parse XML to find boats identification
                root = ET.fromstring(bytes(configdata_xml, 'utf8'))
                self.ship_dict.new_boat([[prefixe + boat.attrib['id'], boat.attrib['name']] for boat in list(root.find("./boats/"))])

                #Get boats tracks
                tracks_url = root_url + driver.execute_script("return tracker._getRessourceUrl('tracks')")
                x = requests.get(tracks_url)
                tracks_json = driver.execute_script("return new TextDecoder('utf-8').decode(new UInt8Array(arguments[0]))", list(x.content))
                tracks = json.loads(tracks_json)
                for boat_track in tracks['tracks']:
                    self.ship_dict.add_chunk(boat_track, prefixe=prefixe)

    def export_as_gpx(self):
        """
        Export to GPX, one GPX for all boat, track name is boat name
        Implement track color Dispalay according to GPX Extension
        """
        for boat in self.ship_dict.all_ships():
            #Create small XML tree to pass as GPX extention, first tag not taken into account
            #GPX Extension to define track color
            root_extension = ET.Element('')
            track_extension = ET.SubElement(root_extension, 'gpxx:TrackExtension')
            track_color = ET.SubElement(track_extension, 'gpxx:DisplayColor')

            #Initiate Track
            gpx_track = GPXTrack()
            gpx_track.name = boat.name
            self.gpx.tracks.append(gpx_track)
            track_color.text = self.gpxx_color[random.randrange(len(self.gpxx_color))]
            gpx_track.extensions = root_extension

            #Initiate TrackSegment
            gpx_segment = GPXTrackSegment()
            gpx_track.segments.append(gpx_segment)
            for position in boat.positions:
                gpx_segment.points.append(GPXTrackPoint(position.latitude, position.longitude))

        with open('all.gpx', 'w') as f:
            f.write(self.gpx.to_xml())

# if this not loaded as part of an `import` statement
if __name__ == '__main__':
    # create a Merger instance
    merger = Merger()
    # send it the main method and transmit this return code right to wait()
    exit(merger.main())
